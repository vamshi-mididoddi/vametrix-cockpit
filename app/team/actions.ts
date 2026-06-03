'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export async function updateUserRole(userId: string, role: 'admin' | 'team'): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!userId || !['admin', 'team'].includes(role)) return { ok: false, error: 'invalid input' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('user_profiles').update({ role }).eq('id', userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function inviteUser(email: string, fullName: string, role: 'admin' | 'team'): Promise<{ ok: boolean; error?: string; invite_url?: string }> {
  await requireAdmin();
  if (!email) return { ok: false, error: 'email required' };
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (error) return { ok: false, error: error.message };
    // Set role on the auto-created profile
    if (data?.user?.id) {
      await supa.from('user_profiles').upsert({
        id: data.user.id,
        role,
        full_name: fullName || email,
      });
    }
    return { ok: true, invite_url: (data as any)?.properties?.action_link };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
