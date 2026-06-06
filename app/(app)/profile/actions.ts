'use server';

import { createServerSupabase } from '@/lib/supabase-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
  try {
    const supa = createServerSupabase();
    const { error } = await supa.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function updateFullName(fullName: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuth();
  if (!fullName) return { ok: false, error: 'name required' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('user_profiles').update({ full_name: fullName }).eq('id', user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
