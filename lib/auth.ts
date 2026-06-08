import { createServerSupabase } from './supabase-auth';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type UserRole = 'admin' | 'team' | 'master_admin';

// Befach's tenant_id, hardcoded fallback while we're single-tenant.
// When client #2 signs, this fallback is removed and tenant_id MUST come from user_profiles.
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-befac0000001';

export interface AuthedUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  tenant_id: string;          // never null — falls back to DEFAULT_TENANT_ID
  tenant_slug?: string;       // e.g. 'befach_international'
  tenant_name?: string;       // e.g. 'Befach International'
}

// Wrapped with React.cache so multiple calls per request hit Supabase only ONCE.
// This deduplicates calls from layout.tsx + topbar + each page component.
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  try {
    const supa = createServerSupabase();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return null;
    // Single round-trip: profile + its tenant (slug,name) via the FK embed,
    // instead of two sequential queries. Cuts one cross-network hop per page.
    const { data: profile } = await supa
      .from('user_profiles')
      .select('role,full_name,tenant_id,tenants(slug,name)')
      .eq('id', user.id)
      .maybeSingle();
    const tenant_id = (profile as any)?.tenant_id || DEFAULT_TENANT_ID;
    const t = (profile as any)?.tenants;
    const tenant_slug: string | undefined = t?.slug;
    const tenant_name: string | undefined = t?.name;
    return {
      id: user.id,
      email: user.email || null,
      full_name: profile?.full_name || user.email || null,
      role: (profile?.role as UserRole) || 'team',
      tenant_id,
      tenant_slug,
      tenant_name,
    };
  } catch {
    return null;
  }
});

export async function requireAuth(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u!;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const u = await requireAuth();
  if (u.role !== 'admin' && u.role !== 'master_admin') redirect('/dashboard?forbidden=1');
  return u;
}

// Routes only admin can visit (paths startsWith)
export const ADMIN_ONLY_PATHS = [
  '/cost', '/settings', '/audit', '/opt-outs', '/workflows', '/knowledge',
  '/marketing', '/tech-audit', '/brands', '/ceo', '/outbound', '/hunter',
  '/agent-2','/agent-3','/agent-4','/agent-5','/agent-6','/agent-7','/agent-8','/agent-9',
  '/agent-10','/agent-11','/agent-12','/agent-13','/agent-14','/agent-15','/agent-16',
];

export function isAdminOnlyPath(path: string) {
  return ADMIN_ONLY_PATHS.some(p => path === p || path.startsWith(p + '/'));
}
