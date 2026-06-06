import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { RemindersClient } from './client';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const { data } = await supa
    .from('scheduled_reminders')
    .select('*')
    .order('scheduled_at', { ascending: true })
    .limit(200);
  return (data || []) as any[];
}

export default async function Page() {
  await requireAuth();

  const reminders = await load();
  return (
    <>
      <TopBar title="Smart Reminders" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <RemindersClient initialReminders={reminders} />
      </div>
    </>
  );
}
