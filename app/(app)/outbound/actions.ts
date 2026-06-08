'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId, getTenantCredentials } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

const N8N_FALLBACK = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';
type R = { ok: boolean; error?: string; [k: string]: any };

export async function createCampaign(input: {
  name: string; brand?: string; template_name: string; template_language?: string; daily_cap?: number;
}): Promise<R> {
  const u = await requireAdmin();
  if (!input.name?.trim() || !input.template_name) return { ok: false, error: 'name + template required' };
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.from('outbound_campaigns').insert({
      tenant_id: u.tenant_id,
      name: input.name.trim(),
      brand: input.brand || 'mixed',
      template_name: input.template_name,
      template_language: input.template_language || 'en',
      daily_cap: input.daily_cap || 200,
      status: 'draft',
      created_by: u.id,
    }).select('id').single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/outbound');
    return { ok: true, campaign_id: data.id };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

// Parse a blob of phones (one per line, or "phone,name") → insert contacts.
export async function addContacts(campaign_id: number, raw: string): Promise<R> {
  const u = await requireAdmin();
  if (!campaign_id || !raw?.trim()) return { ok: false, error: 'campaign + contacts required' };
  try {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: any[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      let phone = (parts[0] || '').replace(/[^0-9+]/g, '');
      const name = parts[1] || null;
      if (!phone) continue;
      // normalize India numbers: add 91 if 10-digit
      const digits = phone.replace(/[^0-9]/g, '');
      const norm = digits.length === 10 ? '91' + digits : digits;
      if (norm.length < 11 || seen.has(norm)) continue;
      seen.add(norm);
      rows.push({ campaign_id, tenant_id: u.tenant_id, phone: norm, name, status: 'pending' });
    }
    if (rows.length === 0) return { ok: false, error: 'no valid phone numbers found' };
    const supa = supabaseAdmin();
    // upsert (ignore dups within campaign)
    const { error } = await supa.from('outbound_contacts').upsert(rows, { onConflict: 'campaign_id,phone', ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
    // refresh total_contacts
    const { count } = await supa.from('outbound_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign_id);
    await supa.from('outbound_campaigns').update({ total_contacts: count || 0, updated_at: new Date().toISOString() }).eq('id', campaign_id);
    revalidatePath('/outbound');
    return { ok: true, added: rows.length };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

export async function setCampaignStatus(campaign_id: number, status: 'active' | 'paused' | 'draft' | 'done'): Promise<R> {
  await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('outbound_campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', campaign_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/outbound');
    return { ok: true };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}

// Send a batch right now (don't wait for the 5-min cron).
export async function runNow(): Promise<R> {
  await requireAdmin();
  try {
    let base = N8N_FALLBACK;
    try { const tid = await getCurrentTenantId(); const c = await getTenantCredentials(tid, 'n8n'); if (c.base_url) base = c.base_url; } catch {}
    const r = await fetch(`${base.replace(/\/$/, '')}/webhook/vametrix-3-outbound-run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) return { ok: false, error: `run http ${r.status}` };
    const out = await r.json().catch(() => ({}));
    revalidatePath('/outbound');
    return { ok: true, ...out };
  } catch (e: any) { return { ok: false, error: String(e?.message || e) }; }
}
