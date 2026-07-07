// Kernel customer-graph helpers: contacts, leads, conversations, messages,
// events, memory. Every function takes orgId explicitly â€” tenant scoping is
// never implicit.
import { db, must } from '../lib/db';

export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^\d+]/g, '');
  if (!p.startsWith('+')) {
    // Default-country heuristic for v0 (India). Phase 1: per-tenant default region.
    if (p.length === 10) p = `+91${p}`;
    else p = `+${p}`;
  }
  return p;
}

export async function upsertContact(orgId: string, fields: {
  phone?: string; email?: string; full_name?: string; company?: string; city?: string; language?: string;
}): Promise<{ id: string }> {
  const phone = fields.phone ? normalizePhone(fields.phone) : undefined;
  if (phone) {
    const { data: existing } = await db
      .from('sales_contacts').select('id').eq('org_id', orgId).eq('phone', phone).maybeSingle();
    if (existing) {
      const patch: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) if (v && k !== 'phone') patch[k] = v;
      if (Object.keys(patch).length) await db.from('sales_contacts').update(patch).eq('id', existing.id);
      return existing;
    }
  }
  return must(
    await db.from('sales_contacts').insert({ org_id: orgId, ...fields, phone }).select('id').single(),
    'insert contact',
  );
}

export async function openLeadFor(orgId: string, contactId: string): Promise<{ id: string; status: string } | null> {
  const { data } = await db
    .from('sales_leads')
    .select('id,status')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .not('status', 'in', '(won,lost,disqualified)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function createLead(orgId: string, contactId: string, source: string, sourceDetail: object): Promise<{ id: string }> {
  const lead = must(
    await db.from('sales_leads').insert({
      org_id: orgId, contact_id: contactId, source, source_detail: sourceDetail,
    }).select('id').single(),
    'insert lead',
  );
  await logEvent(orgId, lead.id, 'lead_created', 'system', { source, ...sourceDetail });
  return lead;
}

export async function advanceLead(leadId: string, newStatus: string, actor = 'ai', reason: object = {}) {
  const { error } = await db.rpc('sales_advance_lead', {
    p_lead_id: leadId, p_new_status: newStatus, p_actor: actor, p_reason: reason,
  });
  if (error) throw new Error(`advance lead: ${error.message}`);
}

export async function logEvent(orgId: string, leadId: string, type: string, actor: string, payload: object = {}) {
  await db.from('sales_lead_events').insert({
    org_id: orgId, lead_id: leadId, event_type: type, actor, payload,
  });
}

export async function ensureConversation(orgId: string, contactId: string, leadId: string | null, channelId: string | null): Promise<{ id: string; status: string }> {
  const { data: existing } = await db
    .from('sales_conversations')
    .select('id,status')
    .eq('org_id', orgId)
    .eq('contact_id', contactId)
    .neq('status', 'closed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;
  return must(
    await db.from('sales_conversations').insert({
      org_id: orgId, contact_id: contactId, lead_id: leadId, channel_id: channelId, status: 'open',
    }).select('id,status').single(),
    'insert conversation',
  );
}

export async function storeMessage(orgId: string, conversationId: string, msg: {
  direction: 'inbound' | 'outbound';
  sender: string;
  content_type?: string;
  body?: string | null;
  media_url?: string | null;
  transcription?: string | null;
  extraction?: string | null;
  external_id?: string | null;
  ai_meta?: object;
}): Promise<{ id: string } | null> {
  const { data, error } = await db.from('sales_messages').insert({
    org_id: orgId, conversation_id: conversationId, content_type: 'text', ...msg,
  }).select('id').single();
  // Unique violation on external_id = webhook retry â†’ treat as already-stored.
  if (error) {
    if (error.message.includes('duplicate key')) return null;
    throw new Error(`store message: ${error.message}`);
  }
  await db.from('sales_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  return data;
}

export async function scheduleFollowup(orgId: string, leadId: string, dueInHours: number, reason: string, context: object = {}, attemptNo = 1) {
  // Supersede any pending followup for this lead, then schedule the new one.
  await db.from('sales_followups')
    .update({ status: 'superseded' })
    .eq('org_id', orgId).eq('lead_id', leadId).eq('status', 'pending');
  const due = new Date(Date.now() + dueInHours * 3600_000).toISOString();
  await db.from('sales_followups').insert({
    org_id: orgId, lead_id: leadId, due_at: due, reason, context, attempt_no: attemptNo,
  });
  await db.from('sales_leads').update({ next_action_at: due }).eq('id', leadId);
}

export async function getMemory(orgId: string, contactId: string): Promise<{ summary: string; facts: any[] }> {
  const { data } = await db
    .from('sales_contact_memory')
    .select('summary,facts')
    .eq('org_id', orgId).eq('contact_id', contactId)
    .maybeSingle();
  return data ?? { summary: '', facts: [] };
}

export async function appendFact(orgId: string, contactId: string, fact: string) {
  const current = await getMemory(orgId, contactId);
  const facts = [...(current.facts ?? []), { fact, learned_at: new Date().toISOString() }];
  await db.from('sales_contact_memory').upsert(
    { org_id: orgId, contact_id: contactId, summary: current.summary ?? '', facts, updated_at: new Date().toISOString() },
    { onConflict: 'org_id,contact_id' },
  );
}
