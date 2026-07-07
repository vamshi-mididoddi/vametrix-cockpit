// WhatsApp template lifecycle â€” the deterministic layer that lets the platform
// speak outside Meta's 24h window. The AI drafts in the tenant's brand voice,
// we submit to Meta, poll approval, and hand approved templates to the
// follow-up engine.
import { db, must } from '../lib/db';
import { chat } from '../lib/llm';
import { getServiceCredentials } from './credentials';
import type { Org } from './tenants';

const GRAPH = 'https://graph.facebook.com';

async function wabaApi(orgId: string): Promise<{ base: string; token: string }> {
  const creds = await getServiceCredentials(orgId, 'meta_whatsapp');
  if (!creds.waba_id || !creds.access_token) throw new Error('WABA credentials missing in vault');
  return {
    base: `${GRAPH}/${creds.graph_version ?? 'v22.0'}/${creds.waba_id}`,
    token: creds.access_token,
  };
}

/** Find an approved template for a purpose, or null. */
export async function approvedTemplate(orgId: string, purpose: string): Promise<{ name: string; language: string; var_count: number } | null> {
  const { data } = await db.from('sales_templates')
    .select('name,language,var_count')
    .eq('org_id', orgId).eq('purpose', purpose).eq('status', 'approved')
    .limit(1).maybeSingle();
  return data ?? null;
}

/** True if any template for this purpose is already draft/pending (avoid duplicate submissions). */
export async function templateInFlight(orgId: string, purpose: string): Promise<boolean> {
  const { count } = await db.from('sales_templates')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId).eq('purpose', purpose).in('status', ['draft', 'pending']);
  return (count ?? 0) > 0;
}

/** AI drafts a template in the tenant's brand voice and submits it to Meta. */
export async function draftAndSubmitTemplate(org: Org, purpose: string): Promise<{ name: string; submitted: boolean; error?: string }> {
  const draft = await chat({
    orgId: org.id, action: 'template_draft', tier: 'premium', maxTokens: 400,
    messages: [
      {
        role: 'system',
        content:
          `You write WhatsApp message TEMPLATES for ${org.name} (B2B sales). Meta rules: no promotional spam wording, ` +
          `professional, concise (2-3 short sentences), exactly ONE variable {{1}} = the customer's first name. ` +
          `The template must read naturally for ANY customer in this situation â€” it is reused across many people. ` +
          `Write in the company's warm, expert sales voice. Output ONLY the template body text, nothing else.`,
      },
      {
        role: 'user',
        content: {
          no_reply: 'Situation: we spoke with this lead about our products, they went quiet. Re-open the conversation and invite an easy reply.',
          quote_pending: 'Situation: we sent this lead a quotation, they have not responded. Nudge gently, offer to answer questions.',
          re_engage_dormant: 'Situation: lead went cold weeks ago. One graceful, valuable re-introduction that invites them back.',
          meeting_reminder: 'Situation: remind about an upcoming scheduled call/meeting with our team.',
          opener: 'Situation: this person just submitted an inquiry form about our products. Open the conversation and ask what they are looking for.',
        }[purpose] ?? `Situation: ${purpose}. Write a re-engagement template.`,
      },
    ],
  });
  const body = (draft.content ?? '').trim();
  if (!body || !body.includes('{{1}}')) {
    return { name: '', submitted: false, error: 'draft missing {{1}} variable' };
  }

  const name = `vmx_${purpose}_${Date.now().toString(36)}`.toLowerCase();
  const row = must(await db.from('sales_templates').insert({
    org_id: org.id, name, language: 'en', category: 'MARKETING',
    purpose, body_text: body, var_count: 1, status: 'draft', created_by: 'ai',
  }).select('id').single(), 'insert template');

  try {
    const { base, token } = await wabaApi(org.id);
    const res = await fetch(`${base}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, language: 'en', category: 'MARKETING',
        components: [{
          type: 'BODY', text: body,
          example: { body_text: [['there']] },
        }],
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      await db.from('sales_templates').update({ status: 'rejected', reject_reason: out.error?.message ?? 'submit failed' }).eq('id', row.id);
      return { name, submitted: false, error: out.error?.message };
    }
    await db.from('sales_templates').update({ status: 'pending', meta_id: out.id ?? null }).eq('id', row.id);
    return { name, submitted: true };
  } catch (e) {
    await db.from('sales_templates').update({ status: 'rejected', reject_reason: (e as Error).message }).eq('id', row.id);
    return { name, submitted: false, error: (e as Error).message };
  }
}

/** Sync approval statuses from Meta for all pending templates (all orgs). */
export async function pollTemplateStatuses(): Promise<void> {
  const { data: pending } = await db.from('sales_templates')
    .select('id,org_id,name').eq('status', 'pending');
  const byOrg = new Map<string, Array<{ id: string; name: string }>>();
  for (const t of pending ?? []) {
    (byOrg.get(t.org_id) ?? byOrg.set(t.org_id, []).get(t.org_id)!).push(t);
  }
  for (const [orgId, templates] of byOrg) {
    try {
      const { base, token } = await wabaApi(orgId);
      const res = await fetch(`${base}/message_templates?fields=name,status,rejected_reason&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = await res.json();
      if (!res.ok) continue;
      const statusByName = new Map<string, any>((list.data ?? []).map((t: any) => [t.name, t]));
      for (const t of templates) {
        const remote = statusByName.get(t.name);
        if (!remote) continue;
        if (remote.status === 'APPROVED') {
          await db.from('sales_templates').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', t.id);
        } else if (remote.status === 'REJECTED') {
          await db.from('sales_templates').update({ status: 'rejected', reject_reason: remote.rejected_reason ?? 'rejected by Meta' }).eq('id', t.id);
        }
      }
    } catch (e) {
      console.error(`[templates] poll failed for org ${orgId}:`, (e as Error).message);
    }
  }
}

/** Is the 24h customer-service window open for this conversation? */
export async function windowOpen(conversationId: string): Promise<boolean> {
  const { data } = await db.from('sales_messages')
    .select('created_at')
    .eq('conversation_id', conversationId).eq('direction', 'inbound')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return false; // never heard from them â†’ window closed
  return Date.now() - new Date(data.created_at).getTime() < 23.5 * 3600_000; // 30min safety margin
}
