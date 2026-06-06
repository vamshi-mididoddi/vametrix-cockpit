import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { MarketingClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const [
    { data: briefs },
    { data: plans },
    { data: assets },
    { data: launches },
    { data: lastAudit },
  ] = await Promise.all([
    supa.from('marketing_briefs').select('*').order('created_at', { ascending: false }).limit(30),
    supa.from('marketing_plans').select('*').order('generated_at', { ascending: false }).limit(30),
    supa.from('creative_assets').select('*').order('created_at', { ascending: false }).limit(200),
    supa.from('ad_launches').select('*').order('created_at', { ascending: false }).limit(30),
    supa.from('tech_audits').select('*').order('audited_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    briefs: briefs || [],
    plans: plans || [],
    assets: assets || [],
    launches: launches || [],
    lastAudit: lastAudit || null,
  };
}

export default async function Page() {
  await requireAdmin();
  const data = await load();
  return (
    <>
      <TopBar title="Marketing Brain" breadcrumb="Strategist · Creatives · Launches" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <MarketingClient
          initialBriefs={data.briefs}
          initialPlans={data.plans}
          initialAssets={data.assets}
          initialLaunches={data.launches}
          lastAudit={data.lastAudit}
        />
      </div>
    </>
  );
}
