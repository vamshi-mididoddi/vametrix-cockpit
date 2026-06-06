'use server';

import { supabaseAdmin } from '@/lib/supabase';

const STAGES = ['new', 'engaged', 'qualified', 'hot', 'escalate', 'lost'];

export async function updateLeadStage(phone: string, newStage: string): Promise<{ ok: boolean; error?: string }> {
  if (!phone) return { ok: false, error: 'phone required' };
  if (!STAGES.includes(newStage)) return { ok: false, error: 'invalid stage' };
  try {
    const supa = supabaseAdmin();
    // Insert a new row capturing the manual override (leads_log has multi-row-per-phone — additive)
    const { error } = await supa.from('leads_log').insert({
      phone,
      stage: newStage,
      source: 'cockpit_manual_override',
      meta: { manual_stage_change: true, changed_by: 'cockpit_user', changed_at: new Date().toISOString() },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
