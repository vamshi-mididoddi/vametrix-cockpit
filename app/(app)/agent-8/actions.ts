'use server';

import { supabaseAdmin } from '@/lib/supabase';

export async function updateDecisionStatus(
  decisionId: number,
  newStatus: 'approved' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supa = supabaseAdmin();
    const { error } = await supa
      .from('perf_decisions')
      .update({
        approval_status: newStatus,
        approved_at: new Date().toISOString(),
        approved_by: 'cockpit_user',
      })
      .eq('id', decisionId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
