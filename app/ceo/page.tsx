import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId } from '@/lib/tenant';
import { CeoClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const tenantId = await getCurrentTenantId();
  const [
    { data: state },
    { data: observations },
    { data: summary },
    { data: latestDigest },
  ] = await Promise.all([
    supa.from('engine_state').select('*').eq('tenant_id', tenantId).order('agent_id'),
    supa.from('ceo_observations').select('*').eq('tenant_id', tenantId).eq('resolved', false).order('observed_at', { ascending: false }).limit(50),
    supa.rpc('engine_health_summary', { p_tenant_id: tenantId }),
    supa.from('ceo_observations').select('*').eq('tenant_id', tenantId).eq('observation_kind', 'digest').order('observed_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    state: state || [],
    observations: observations || [],
    summary: (Array.isArray(summary) ? summary[0] : summary) || null,
    latestDigest: latestDigest || null,
  };
}

export default async function Page() {
  await requireAdmin();
  const data = await load();
  return (
    <>
      <TopBar title="VAMETRIX CEO" breadcrumb="Agent #0 · Engine supervisor" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <CeoClient {...data} />
      </div>
    </>
  );
}
