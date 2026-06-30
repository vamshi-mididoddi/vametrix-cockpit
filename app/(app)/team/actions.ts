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

function randomPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += charset.charAt(Math.floor(Math.random() * charset.length));
  return 'Vam-' + pw;
}

export async function inviteUser(email: string, fullName: string, role: 'admin' | 'team'): Promise<{ ok: boolean; error?: string; temp_password?: string; email?: string }> {
  const admin = await requireAdmin();
  if (!email) return { ok: false, error: 'email required' };
  try {
    const supa = supabaseAdmin();
    const tempPassword = randomPassword();
    // Create user directly with auto-confirmed email — no SMTP needed
    const { data, error } = await supa.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || email },
    });
    if (error) return { ok: false, error: error.message };
    // Set role + inherit admin's tenant_id on the auto-created profile.
    // (Falls back to Befach tenant via column DEFAULT if column doesn't exist yet.)
    if (data?.user?.id) {
      await supa.from('user_profiles').upsert({
        id: data.user.id,
        role,
        full_name: fullName || email,
        tenant_id: admin.tenant_id,
      } as any);
    }
    return { ok: true, temp_password: tempPassword, email };
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
