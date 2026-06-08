'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId, getTenantCredentials } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

const N8N_FALLBACK = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';
type R = { ok: boolean; error?: string; [k: string]: any };

async function n8nBase(): Promise<string> {
  try { const tid = await getCurrentTenantId(); const c = await getTenantCredentials(tid, 'n8n'); if (c?.base_url) return c.base_url.replace(/\/$/, ''); } catch {}
  return N8N_FALLBACK.replace(/\/$/, '');
}

// Fire Agent #6 — synchronous (the hunt takes ~10-40s: LLM + Overpass + store).
export async function runHunt(input: { vertical: string; geo: string; count?: number; brand?: string }): Promise<R> {
  const u = await requireAdmin();
  if (!input.vertical || !input.geo) return { ok: false, error: 'vertical + geo required' };
  try {
    const base = await n8nBase();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 90_000);
    const r = await fetch(`${base}/webhook/vametrix-6-hunt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vertical: input.vertical, geo: input.geo,
        count: input.count || 40, brand: input.brand || 'mixed',
        tenant_id: u.tenant_id, created_by: u.id,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) { const tx = await r.text().catch(() => ''); return { ok: false, error: `hunt http ${r.status}: ${tx.slice(0, 200)}` }; }
    const out = await r.json().catch(() => ({}));
    revalidatePath('/hunter');
    return { ok: !!out?.ok, ...out };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'hunt timed out (Overpass slow) — try a smaller count or narrower geo' };
    return { ok: false, error: String(e?.message || e) };
  }
}

// Push selected discovered contacts into a NEW draft Outbound campaign.
export async function pushToOutbound(input: {
  contact_ids: number[]; campaign_name: string; brand?: string;
  template_name: string; template_language?: string;
}): Promise<R> {
  const u = await requireAdmin();
  if (!input.contact_ids?.length) return { ok: false, error: 'select at least one contact' };
  if (!input.campaign_name?.trim() || !input.template_name) return { ok: false, error: 'campaign name + template required' };
  try {
    const supa = supabaseAdmin();
    const { data: contacts, error: cErr } = await supa
      .from('discovered_contacts')
      .select('id,name,phone')
      .in('id', input.contact_ids)
      .eq('tenant_id', u.tenant_id)
      .not('phone', 'is', null);
    if (cErr) return { ok: false, error: cErr.message };
    if (!contacts?.length) return { ok: false, error: 'none of the selected contacts have a phone number' };

    const { data: camp, error: campErr } = await supa.from('outbound_campaigns').insert({
      tenant_id: u.tenant_id, name: input.campaign_name.trim(), brand: input.brand || 'mixed',
      template_name: input.template_name, template_language: input.template_language || 'en',
      status: 'draft', created_by: u.id,
    }).select('id').single();
    if (campErr) return { ok: false, error: campErr.message };

    const rows = contacts.map(c => ({ campaign_id: camp.id, tenant_id: u.tenant_id, phone: c.phone, name: c.name, status: 'pending' }));
    const { error: insErr } = await supa.from('outbound_contacts').upsert(rows, { onConflict: 'campaign_id,phone', ignoreDuplicates: true });
    if (insErr) return { ok: false, error: insErr.message };

    await supa.from('outbound_campaigns').update({ total_contacts: rows.length }).eq('id', camp.id);
    await supa.from('discovered_contacts').update({ status: 'added' }).in('id', contacts.map(c => c.id));

    revalidatePath('/hunter'); revalidatePath('/outbound');
    return { ok: true, campaign_id: camp.id, added: rows.length };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

export async function dismissDiscovered(contact_ids: number[]): Promise<R> {
  const u = await requireAdmin();
  if (!contact_ids?.length) return { ok: false, error: 'nothing selected' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('discovered_contacts').update({ status: 'skipped' }).in('id', contact_ids).eq('tenant_id', u.tenant_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/hunter');
    return { ok: true };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}
