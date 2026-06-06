import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { BroadcastClient } from './client';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadApprovedTemplates() {
  const supa = supabaseAdmin();
  const { data } = await supa
    .from('wa_templates')
    .select('template_name,language,category,body')
    .eq('status', 'APPROVED')
    .order('template_name', { ascending: true });
  return (data || []) as any[];
}

export default async function Page() {
  await requireAdmin();

  const templates = await loadApprovedTemplates();
  return (
    <>
      <TopBar title="Broadcast" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <BroadcastClient templates={templates} />
      </div>
    </>
  );
}
