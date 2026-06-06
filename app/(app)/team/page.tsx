import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { TeamClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadUsers() {
  const supa = supabaseAdmin();
  // List all auth users + join profiles
  const { data: profiles } = await supa
    .from('user_profiles')
    .select('id,role,full_name,created_at')
    .order('created_at', { ascending: true });

  // Pull emails from auth.admin (service role can list users)
  const { data: usersRes } = await supa.auth.admin.listUsers({ perPage: 500 });
  const emailById: Record<string, string> = {};
  const lastSignInById: Record<string, string> = {};
  for (const u of (usersRes?.users || []) as any[]) {
    emailById[u.id] = u.email || '';
    lastSignInById[u.id] = u.last_sign_in_at || '';
  }
  return (profiles || []).map((p: any) => ({
    id: p.id,
    role: p.role,
    full_name: p.full_name,
    created_at: p.created_at,
    email: emailById[p.id] || '',
    last_sign_in: lastSignInById[p.id] || '',
  }));
}

export default async function Page() {
  await requireAdmin();
  const users = await loadUsers();
  return (
    <>
      <TopBar title="Team & Roles" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <TeamClient initialUsers={users} />
      </div>
    </>
  );
}
