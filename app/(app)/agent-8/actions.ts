'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId, getTenantCredentials } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

const N8N_FALLBACK = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';

export async function updateDecisionStatus(
  decisionId: number,
  newStatus: 'approved' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa
      .from('perf_decisions')
      .update({
        approval_status: newStatus,
        approved_at: new Date().toISOString(),
        approved_by: u.full_name || u.email || 'admin',
      })
      .eq('id', decisionId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/agent-8');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Trigger the Perf Brain to re-analyze the account on demand.
export async function runPerfAnalysis(): Promise<{ ok: boolean; error?: string; decisions?: number }> {
  await requireAdmin();
  try {
    let base = N8N_FALLBACK;
    try {
      const tid = await getCurrentTenantId();
      const c = await getTenantCredentials(tid, 'n8n');
      if (c.base_url) base = c.base_url;
    } catch {}
    base = base.replace(/\/$/, '');
    const r = await fetch(`${base}/webhook/vametrix-82-analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) return { ok: false, error: `analyze http ${r.status}` };
    const out = await r.json().catch(() => ({}));
    revalidatePath('/agent-8');
    return { ok: true, decisions: out?.decisions };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
