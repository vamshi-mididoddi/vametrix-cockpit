// Inbound WhatsApp event processing â€” shared by the direct webhook route and
// the queue poller (n8n relay path). One code path no matter how the event
// arrives.
import { db } from '../../lib/db';
import { orgBySlug, orgChannel } from '../../kernel/tenants';
import {
  createLead, ensureConversation, logEvent, normalizePhone,
  openLeadFor, storeMessage, upsertContact,
} from '../../kernel/crm';
import { respond } from './agent';

export async function processWhatsappEvent(slug: string, body: any): Promise<void> {
  const org = await orgBySlug(slug);
  const channel = await orgChannel(org.id, 'whatsapp');
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        const phone = normalizePhone(msg.from);
        const name = change.value?.contacts?.[0]?.profile?.name;
        const contact = await upsertContact(org.id, { phone, full_name: name });
        let lead = await openLeadFor(org.id, contact.id);
        if (!lead) {
          const created = await createLead(org.id, contact.id, 'whatsapp_inbound', {});
          lead = { id: created.id, status: 'new' };
        }
        const conversation = await ensureConversation(org.id, contact.id, lead.id, channel?.id ?? null);
        const contentType =
          msg.type === 'audio' ? 'voice'
          : msg.type === 'image' ? 'image'
          : msg.type === 'document' ? 'document'
          : 'text';
        const stored = await storeMessage(org.id, conversation.id, {
          direction: 'inbound',
          sender: 'contact',
          content_type: contentType,
          body: msg.text?.body ?? msg.image?.caption ?? msg.document?.caption ?? null,
          external_id: msg.id,
          ai_meta: { wa_type: msg.type, media_id: msg.audio?.id ?? msg.image?.id ?? msg.document?.id ?? null },
        });
        if (!stored) continue; // webhook retry â€” already handled
        // Customer replied â†’ any pending followup is stale.
        await db.from('sales_followups')
          .update({ status: 'superseded' })
          .eq('org_id', org.id).eq('lead_id', lead.id).eq('status', 'pending');
        await logEvent(org.id, lead.id, 'message', 'system', { direction: 'inbound', type: contentType });
        // Burst merge: if the customer already sent a NEWER message that is
        // still waiting in the queue, stay silent now â€” the newer event will
        // produce ONE reply that reads the whole burst. Kills the
        // reply-per-message spam and most of the perceived lag.
        const { count: newerPending } = await db.from('sales_inbound_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .like('payload->entry->0->changes->0->value->messages->0->>from', `%${msg.from}`);
        if ((newerPending ?? 0) > 0) continue;
        // S-02: the brain answers â€” unless a human owns this conversation.
        if (conversation.status !== 'handed_off') {
          await respond(org, contact.id, lead.id, conversation.id);
        }
      }
    }
  }
}
