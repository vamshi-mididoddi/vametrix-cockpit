import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { AgentEightClient } from './client';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [{ data: decs }, { data: ads }] = await Promise.all([
    supa.from('perf_decisions').select('*').order('decided_at', { ascending: false }).limit(50),
    supa.from('ad_campaigns_log').select('*').gte('snapshot_date', since).order('snapshot_date', { ascending: false }).limit(500),
  ]);
  return { decs: decs || [], ads: ads || [] };
}

export default async function Page() {
  await requireAdmin();
  const { decs, ads } = await load();
  return (
    <>
      <TopBar title="#08 · Performance Marketer" breadcrumb="Sales & Marketing" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <AgentEightClient initialDecs={decs} ads={ads} />
      </div>
    </>
  );
}
