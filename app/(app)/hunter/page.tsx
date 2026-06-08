import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId } from '@/lib/tenant';
import { HunterClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const tenantId = await getCurrentTenantId();
  const [{ data: discovered }, { data: hunts }, { data: templates }] = await Promise.all([
    supa.from('discovered_contacts').select('*').eq('tenant_id', tenantId).eq('status', 'new').order('id', { ascending: false }).limit(300),
    supa.from('buyer_hunt_runs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(8),
    supa.from('wa_templates').select('template_name,language,category,status').eq('status', 'APPROVED').order('template_name'),
  ]);
  return { discovered: discovered || [], hunts: hunts || [], templates: templates || [] };
}

export default async function Page() {
  await requireAdmin();
  const data = await load();
  return (
    <>
      <TopBar title="Buyer Hunter" breadcrumb="Sales & Marketing · Agent #06" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <HunterClient discovered={data.discovered} hunts={data.hunts} templates={data.templates} />
      </div>
    </>
  );
}
