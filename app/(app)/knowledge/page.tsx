import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { KnowledgeClient } from './client';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const [{ data: docs }, { data: chunks }] = await Promise.all([
    supa.from('knowledge_documents').select('*').order('created_at', { ascending: false }).limit(200),
    supa.from('knowledge_chunks').select('id').limit(1000),
  ]);
  return { docs: (docs || []) as any[], chunkCount: (chunks || []).length };
}

export default async function Page() {
  await requireAdmin();
  const { docs, chunkCount } = await load();
  return (
    <>
      <TopBar title="Knowledge Base" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <KnowledgeClient initialDocs={docs} chunkCount={chunkCount} />
      </div>
    </>
  );
}
