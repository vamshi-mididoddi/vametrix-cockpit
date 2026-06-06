import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { LeadDetailClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: { phone: string } }) {
  const user = await requireAuth();
  const phone = decodeURIComponent(params.phone);
  const supa = supabaseAdmin();

  const [
    { data: lead },
    { data: activities },
    { data: conversations },
    { data: owners },
  ] = await Promise.all([
    supa.from('leads_log').select('*').eq('phone', phone).maybeSingle(),
    supa.from('lead_activities').select('*').eq('lead_phone', phone).order('created_at', { ascending: false }).limit(100),
    supa.from('conversations').select('id,direction,message,created_at,meta').eq('phone', phone).order('created_at', { ascending: false }).limit(50),
    supa.from('user_profiles').select('id,full_name,role').eq('tenant_id', user.tenant_id).in('role', ['admin','team']).order('full_name'),
  ]);

  if (!lead) notFound();

  // Resolve owner name
  let ownerName: string | null = null;
  if ((lead as any).owner_id) {
    const found = (owners || []).find(o => (o as any).id === (lead as any).owner_id);
    ownerName = (found as any)?.full_name || null;
  }

  return (
    <>
      <TopBar title={lead.name || phone} breadcrumb="Pipeline · Lead detail" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <LeadDetailClient
          lead={lead}
          activities={(activities || []).reverse()}
          conversations={(conversations || []).reverse()}
          owners={owners || []}
          ownerName={ownerName}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </>
  );
}
