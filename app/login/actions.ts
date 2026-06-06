'use server';

import { createServerSupabase } from '@/lib/supabase-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

type R = { ok: boolean; error?: string; redirect_to?: string };

export async function signIn(email: string, password: string, next: string): Promise<R> {
  if (!email || !password) return { ok: false, error: 'email and password required' };
  try {
    const supa = createServerSupabase();
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    // Post-login redirect. If they were heading somewhere specific, honour it;
    // otherwise everyone lands on /dashboard (which renders role-aware: admin
    // sees Engine Overview, team sees My Today).
    let redirectTo = (next && next !== '/' && !next.startsWith('/login')) ? next : '/dashboard';

    revalidatePath('/', 'layout');
    return { ok: true, redirect_to: redirectTo };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function signUp(email: string, password: string, fullName: string): Promise<R> {
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
