'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { PLAN_TIERS, type PlanTier } from '@/lib/billing';
import { revalidatePath } from 'next/cache';

export async function setTenantPlan(plan: PlanTier): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!PLAN_TIERS.includes(plan)) return { ok: false, error: 'invalid plan' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa
      .from('tenants')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', admin.tenant_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/billing');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
