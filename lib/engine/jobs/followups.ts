// S-03 â€” follow-up engine. Polls for due follow-ups (atomically claimed via
// sales_claim_due_followups, so parallel engine instances never double-send),
// composes each message from live conversation context, sends, and advances
// the cadence. After the final attempt the lead goes dormant with one
// re-engagement touch scheduled.
import { FOLLOWUP_COMPOSER_TEMPLATE } from '../promptTemplates';
import { db } from '../lib/db';
import { chat } from '../lib/llm';
import { renderPrompt } from '../modules/sales/agent';
import { orgById, orgChannel } from '../kernel/tenants';
import { advanceLead, logEvent, scheduleFollowup, storeMessage, ensureConversation } from '../kernel/crm';
import { approvedTemplate, draftAndSubmitTemplate, pollTemplateStatuses, templateInFlight, windowOpen } from '../kernel/templates';

const POLL_MS = 60_000;

function template(): string { return FOLLOWUP_COMPOSER_TEMPLATE; }

export function startFollowupPoller(): void {
  console.log(`[followups] poller active (every ${POLL_MS / 1000}s)`);
  let tickCount = 0;
  const tick = async () => {
    try {
      const { data: due, error } = await db.rpc('sales_claim_due_followups', { p_limit: 25 });
      if (error) throw new Error(error.message);
      for (const f of due ?? []) await processFollowup(f).catch(e =>
        console.error(`[followups] ${f.id} failed:`, (e as Error).message));
      // Template approval sync every ~10 minutes.
      if (tickCount++ % 10 === 0) await pollTemplateStatuses();
    } catch (e) {
      console.error('[followups] tick failed:', (e as Error).message);
    }
  };
  setInterval(tick, POLL_MS);
  void tick();
}

export async function processFollowup(f: any): Promise<void> {
  const org = await orgById(f.org_id);
  const { data: lead } = await db.from('sales_leads').select('*').eq('id', f.lead_id).single();
  if (!lead || ['won', 'lost', 'disqualified'].includes(lead.status)) return;

  const { data: contact } = await db.from('sales_contacts').select('*').eq('id', lead.contact_id).single();
  if (!contact?.phone) return;

  const channel = await orgChannel(org.id, 'whatsapp');
  const channelReady = !!(channel?.identifier && !channel.identifier.startsWith('REPLACE'));
  if (!channelReady || !channel) {
    // Can't send yet â€” push it out a day rather than losing the lead.
    await scheduleFollowup(org.id, lead.id, 24, f.reason, f.context ?? {}, f.attempt_no);
    return;
  }

  const conversation = await ensureConversation(org.id, contact.id, lead.id, channel.id);
  if (conversation.status === 'handed_off') return; // a human owns it

  // Meta's 24h window: outside it only APPROVED templates may be sent.
  if (!(await windowOpen(conversation.id))) {
    const tpl = await approvedTemplate(org.id, f.reason);
    if (!tpl) {
      // No approved template yet â€” have the AI draft + submit one (once),
      // and retry this follow-up after approval typically lands.
      if (!(await templateInFlight(org.id, f.reason))) {
        const result = await draftAndSubmitTemplate(org, f.reason);
        await logEvent(org.id, lead.id, 'template_submitted', 'ai', { purpose: f.reason, ...result });
      }
      await scheduleFollowup(org.id, lead.id, 24, f.reason, f.context ?? {}, f.attempt_no);
      return;
    }
    const firstName = (contact.full_name ?? 'there').split(' ')[0] || 'there';
    const { sendTemplate } = await import('../kernel/channels/whatsapp');
    const sent = await sendTemplate(channel, contact.phone, tpl.name, tpl.language, [firstName]);
    await storeMessage(org.id, conversation.id, {
      direction: 'outbound', sender: 'ai', content_type: 'template',
      body: `[template:${tpl.name}] â†’ ${firstName}`, external_id: sent.messageId,
      ai_meta: { action: 'followup_template', reason: f.reason, attempt: f.attempt_no },
    });
    await logEvent(org.id, lead.id, 'followup_sent', 'ai', { reason: f.reason, attempt: f.attempt_no, via: 'template' });
    await advanceCadence(org, lead.id, f);
    return;
  }

  const { data: memory } = await db.from('sales_contact_memory')
    .select('summary,facts').eq('org_id', org.id).eq('contact_id', contact.id).maybeSingle();
  const { data: recent } = await db.from('sales_messages')
    .select('direction,body').eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false }).limit(5);

  const cadence: number[] = org.config?.followup_cadence_hours ?? [4, 24, 72];
  const system = renderPrompt(template(), {
    org,
    lead,
    contact,
    followup: { reason: f.reason, attempt_no: f.attempt_no, angle: f.context?.angle ?? f.context?.note ?? '' },
    max_attempts: cadence.length,
    contact_memory: { summary: memory?.summary || '(no summary yet)' },
    recent_messages: (recent ?? []).reverse()
      .map(m => `${m.direction === 'inbound' ? 'Customer' : 'You'}: ${m.body ?? '(media)'}`).join('\n'),
  });

  const result = await chat({
    orgId: org.id, leadId: lead.id, action: 'followup_compose', tier: 'default',
    maxTokens: 300, messages: [{ role: 'system', content: system }],
  });
  const text = (result.content ?? '').trim();
  if (!text) throw new Error('composer returned empty');

  const { sendText } = await import('../kernel/channels/whatsapp');
  const sent = await sendText(channel, contact.phone, text);
  await storeMessage(org.id, conversation.id, {
    direction: 'outbound', sender: 'ai', body: text, external_id: sent.messageId,
    ai_meta: { action: 'followup', reason: f.reason, attempt: f.attempt_no },
  });
  await logEvent(org.id, lead.id, 'followup_sent', 'ai', { reason: f.reason, attempt: f.attempt_no });
  await advanceCadence(org, lead.id, f);
}

/** Advance the cadence: next attempt, or dormant + one re-engagement. */
async function advanceCadence(org: any, leadId: string, f: any): Promise<void> {
  const cadence: number[] = org.config?.followup_cadence_hours ?? [4, 24, 72];
  if (f.reason === 'meeting_reminder' || f.reason === 'post_sale_checkin') return;
  if (f.attempt_no < cadence.length) {
    const nextIdx = Math.min(f.attempt_no, cadence.length - 1);
    await scheduleFollowup(org.id, leadId, Number(cadence[nextIdx]), f.reason, f.context ?? {}, f.attempt_no + 1);
  } else if (f.reason !== 're_engage_dormant') {
    await advanceLead(leadId, 'dormant', 'system', { after_attempts: f.attempt_no });
    const dormantDays = Number(org.config?.dormant_after_days ?? 7);
    await scheduleFollowup(org.id, leadId, dormantDays * 24, 're_engage_dormant', { angle: 'last graceful door-open touch' }, 1);
  }
}


/** One synchronous tick for serverless cron: claim due follow-ups + sync template approvals. */
export async function followupsTickOnce(): Promise<number> {
  const { data: due, error } = await db.rpc('sales_claim_due_followups', { p_limit: 25 });
  if (error) throw new Error(error.message);
  for (const f of due ?? []) {
    await processFollowup(f).catch(e => console.error(`[followups] ${f.id} failed:`, (e as Error).message));
  }
  await pollTemplateStatuses();
  return (due ?? []).length;
}