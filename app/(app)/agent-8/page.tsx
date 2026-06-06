import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { AgentEightClient } from './client';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const tenantId = await getCurrentTenantId();
  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const [{ data: decs }, { data: ads }, { data: brief }] = await Promise.all([
    supa.from('perf_decisions').select('*').order('decided_at', { ascending: false }).limit(60),
    supa.from('ad_campaigns_log').select('*').gte('snapshot_date', since).order('snapshot_date', { ascending: false }).limit(600),
    supa.from('ceo_observations').select('summary,detail,observed_at')
      .eq('tenant_id', tenantId).eq('observation_kind', 'perf_brief')
      .order('observed_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { decs: decs || [], ads: ads || [], brief: brief || null };
}

export default async function Page() {
  await requireAdmin();
  const { decs, ads, brief } = await load();
  return (
    <>
      <TopBar title="Performance Marketer" breadcrumb="Sales & Marketing · Agent #08" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <AgentEightClient initialDecs={decs} ads={ads} brief={brief} />
      </div>
    </>
  );
}
