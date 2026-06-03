import { createServerSupabase } from './supabase-auth';
import { redirect } from 'next/navigation';

export type UserRole = 'admin' | 'team';

export interface AuthedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
}

export async function getCurrentUser(): Promise<AuthedUser | null> {
  try {
    const supa = createServerSupabase();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supa
      .from('user_profiles')
      .select('role,full_name')
      .eq('id', user.id)
      .maybeSingle();
    return {
      id: user.id,
      email: user.email || null,
      full_name: profile?.full_name || user.email || null,
      role: (profile?.role as UserRole) || 'team',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u!;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const u = await requireAuth();
  if (u.role !== 'admin') redirect('/?forbidden=1');
  return u;
}

// Routes only admin can visit (paths startsWith)
export const ADMIN_ONLY_PATHS = [
  '/cost', '/settings', '/audit', '/opt-outs', '/workflows', '/knowledge',
  '/agent-2','/agent-3','/agent-4','/agent-5','/agent-6','/agent-7','/agent-8','/agent-9',
  '/agent-10','/agent-11','/agent-12','/agent-13','/agent-14','/agent-15','/agent-16',
];

export function isAdminOnlyPath(path: string) {
  return ADMIN_ONLY_PATHS.some(p => path === p || path.startsWith(p + '/'));
}
