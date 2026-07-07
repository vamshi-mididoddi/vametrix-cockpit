// S-01 â€” Universal lead ingestion. Any source lands here and becomes
// contact + lead + opening WhatsApp touch within 60 seconds.
import { orgChannel, type Org } from '../../kernel/tenants';
import { sendTemplate } from '../../kernel/channels/whatsapp';
import {
  advanceLead, createLead, ensureConversation, logEvent, openLeadFor,
  scheduleFollowup, storeMessage, upsertContact,
} from '../../kernel/crm';

export interface IngestPayload {
  phone: string;
  name?: string;
  email?: string;
  source: string;               // 'meta_leadgen' | 'google_ads' | 'webform' | 'referral' | 'manual' | ...
  source_detail?: Record<string, any>;
  message?: string;             // anything the lead already told us (form answer, etc.)
}

export async function ingestLead(org: Org, p: IngestPayload): Promise<{ leadId: string; opened: boolean; note: string }> {
  const t0 = Date.now();
  const contact = await upsertContact(org.id, {
    phone: p.phone, full_name: p.name, email: p.email,
  });

  // A live journey already owns this contact â€” log the inquiry, don't fork it.
  const existing = await openLeadFor(org.id, contact.id);
  if (existing) {
    await logEvent(org.id, existing.id, 'duplicate_inquiry', 'system', { source: p.source, detail: p.source_detail ?? {} });
    return { leadId: existing.id, opened: false, note: 'existing open lead â€” inquiry logged' };
  }

  const lead = await createLead(org.id, contact.id, p.source, p.source_detail ?? {});

  // Opening move â€” composed, not canned.
  const channel = await orgChannel(org.id, 'whatsapp');
  const channelReady = channel?.identifier && !channel.identifier.startsWith('REPLACE');
  if (!channelReady || !channel) {
    await logEvent(org.id, lead.id, 'first_touch_skipped', 'system', { why: 'whatsapp channel not configured' });
    await scheduleFollowup(org.id, lead.id, firstCadenceHours(org), 'no_reply', { note: 'channel pending' });
    return { leadId: lead.id, opened: false, note: 'lead created; WhatsApp channel not configured yet' };
  }

  // Form/ad leads never messaged us first â†’ Meta's 24h window is CLOSED â†’ the
  // opener MUST be an approved template. (Leads who message us first flow
  // through inbound processing, where free text is allowed.)
  const { approvedTemplate, draftAndSubmitTemplate, templateInFlight } = await import('../../kernel/templates');
  const tpl = await approvedTemplate(org.id, 'opener');
  if (!tpl) {
    if (!(await templateInFlight(org.id, 'opener'))) {
      const result = await draftAndSubmitTemplate(org, 'opener');
      await logEvent(org.id, lead.id, 'template_submitted', 'ai', { purpose: 'opener', ...result });
    }
    // The follow-up engine retries the first touch once the template is approved.
    await scheduleFollowup(org.id, lead.id, 4, 'no_reply', { note: 'opener pending template approval', name: p.name });
    return { leadId: lead.id, opened: false, note: 'lead created; opener template pending Meta approval' };
  }

  const conversation = await ensureConversation(org.id, contact.id, lead.id, channel.id);
  const firstName = (p.name ?? 'there').split(' ')[0] || 'there';
  const sent = await sendTemplate(channel, p.phone, tpl.name, tpl.language, [firstName]);
  await storeMessage(org.id, conversation.id, {
    direction: 'outbound', sender: 'ai', content_type: 'template',
    body: `[template:${tpl.name}] â†’ ${firstName}`, external_id: sent.messageId,
    ai_meta: { action: 'opener_template' },
  });
  await advanceLead(lead.id, 'engaged', 'ai', { via: 'opener_template' });
  await scheduleFollowup(org.id, lead.id, firstCadenceHours(org), 'no_reply', { note: 'after opener template' });
  await logEvent(org.id, lead.id, 'first_touch', 'ai', { latency_ms: Date.now() - t0, via: 'template' });

  return { leadId: lead.id, opened: true, note: `opener template sent in ${Date.now() - t0}ms` };
}

function firstCadenceHours(org: Org): number {
  const cadence = org.config?.followup_cadence_hours;
  return Array.isArray(cadence) && cadence.length ? Number(cadence[0]) : 4;
}
