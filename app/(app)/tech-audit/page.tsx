import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { TechAuditClient } from './client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const { data: audits } = await supa.from('tech_audits').select('*').order('audited_at', { ascending: false }).limit(30);
  return { audits: audits || [] };
}

export default async function Page() {
  await requireAdmin();
  const { audits } = await load();
  return (
    <>
      <TopBar title="Tech Stack Audit" breadcrumb="Pixel · CAPI · GA4 · GTM · Clarity" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <TechAuditClient initialAudits={audits} />
      </div>
    </>
  );
}
