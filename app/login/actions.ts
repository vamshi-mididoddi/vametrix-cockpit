'use server';

import { createServerSupabase } from '@/lib/supabase-auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function signIn(email: string, password: string, next: string): Promise<{ ok: boolean; error?: string }> {
  if (!email || !password) return { ok: false, error: 'email and password required' };
  try {
    const supa = createServerSupabase();
    const { error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ ok: boolean; error?: string }> {
  if (!email || !password) return { ok: false, error: 'email and password required' };
  try {
    const supa = createServerSupabase();
    const { error } = await supa.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function signOut() {
  const supa = createServerSupabase();
  await supa.auth.signOut();
  redirect('/login');
}
