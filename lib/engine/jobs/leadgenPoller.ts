// Meta Lead Ads (instant form) poller â€” pulls new form leads for every org
// that has leadgen_forms configured and pushes them through S-01 ingest.
// Polling (not webhooks) because it needs zero Meta app config and works from
// anywhere; per-lead dedup via leadgen_id.
import { db } from '../lib/db';
import { env, envOr } from '../lib/env';
import { getServiceCredentials } from '../kernel/credentials';
import { ingestLead } from '../modules/sales/ingest';
import type { Org } from '../kernel/tenants';

const POLL_MS = 5 * 60_000;
const GRAPH = 'https://graph.facebook.com';

export function startLeadgenPoller(): void {
  console.log(`[leadgen] poller active (every ${POLL_MS / 60000}min)`);
  const tick = async () => {
    try {
      const { data: orgs } = await db.from('sales_orgs').select('*').eq('status', 'active');
      for (const org of orgs ?? []) {
        const forms: Array<{ form_id: string; label?: string }> = org.config?.leadgen_forms ?? [];
        for (const form of forms) {
          await pollForm(org as Org, form).catch(e =>
            console.error(`[leadgen] form ${form.form_id} (${org.slug}):`, (e as Error).message));
        }
      }
    } catch (e) {
      console.error('[leadgen] tick failed:', (e as Error).message);
    }
  };
  setInterval(tick, POLL_MS);
  void tick();
}

export async function pollForm(org: Org, form: { form_id: string; label?: string }): Promise<void> {
  // Token: tenant vault first, platform env fallback (Befach v0).
  const vault = await getServiceCredentials(org.id, 'meta_ads');
  const token = vault.access_token ?? envOr('META_ACCESS_TOKEN', '');
  if (!token) return;

  const res = await fetch(
    `${GRAPH}/${envOr('META_WHATSAPP_GRAPH_VERSION', 'v22.0')}/${form.form_id}/leads?fields=id,created_time,field_data&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const out = await res.json();
  if (!res.ok) throw new Error(out.error?.message ?? `leads fetch ${res.status}`);

  for (const lead of out.data ?? []) {
    // Dedup on leadgen id.
    const { count } = await db.from('sales_leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('source_detail->>leadgen_id', lead.id);
    if ((count ?? 0) > 0) continue;

    const fields: Record<string, string> = {};
    for (const f of lead.field_data ?? []) fields[f.name] = f.values?.[0] ?? '';
    const phone = fields.phone_number ?? fields.phone ?? Object.entries(fields).find(([k]) => k.includes('phone'))?.[1];
    if (!phone) continue;
    const name = fields.full_name ?? fields.name ?? Object.entries(fields).find(([k]) => k.includes('name'))?.[1];
    const email = fields.email ?? undefined;

    const result = await ingestLead(org, {
      phone, name, email,
      source: 'meta_leadgen',
      source_detail: {
        leadgen_id: lead.id,                    // â† CAPI attribution key
        form_id: form.form_id,
        form_label: form.label ?? null,
        created_time: lead.created_time,
        answers: fields,
      },
      message: Object.entries(fields)
        .filter(([k]) => !['phone_number', 'phone', 'full_name', 'name', 'email'].includes(k))
        .map(([k, v]) => `${k}: ${v}`).join('; ') || undefined,
    });
    console.log(`[leadgen] ingested ${lead.id} (${org.slug}/${form.label ?? form.form_id}): ${result.note}`);
  }
}


/** One leadgen sweep across all orgs (serverless cron path). */
export async function leadgenTickOnce(): Promise<void> {
  const { data: orgs } = await db.from('sales_orgs').select('*').eq('status', 'active');
  for (const org of orgs ?? []) {
    const forms: Array<{ form_id: string; label?: string }> = (org as any).config?.leadgen_forms ?? [];
    for (const form of forms) {
      await pollForm(org as any, form).catch(e =>
        console.error(`[leadgen] form ${form.form_id}:`, (e as Error).message));
    }
  }
}