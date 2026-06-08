import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId } from '@/lib/tenant';
import { OutboundClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const tenantId = await getCurrentTenantId();
  const [{ data: campaigns }, { data: templates }] = await Promise.all([
    supa.from('outbound_campaigns').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
    supa.from('wa_templates').select('template_name,language,category,status').eq('status', 'APPROVED').order('template_name'),
  ]);
  // per-campaign funnel
  const summaries: Record<number, any> = {};
  for (const c of campaigns || []) {
    const { data: s } = await supa.rpc('outbound_campaign_summary', { p_campaign_id: c.id });
    summaries[c.id] = Array.isArray(s) ? s[0] : s;
  }
  return { campaigns: campaigns || [], templates: templates || [], summaries };
}

export default async function Page() {
  await requireAdmin();
  const data = await load();
  return (
    <>
      <TopBar title="Outbound B2B" breadcrumb="Sales & Marketing · Agent #03" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <OutboundClient campaigns={data.campaigns} templates={data.templates} summaries={data.summaries} />
      </div>
    </>
  );
}
