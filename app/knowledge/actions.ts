'use server';

import { supabaseAdmin } from '@/lib/supabase';

const KNOWLEDGE_LOADER_WEBHOOK = 'https://n8n.srv1048087.hstgr.cloud/webhook/vametrix-30-knowledge-load';

export async function addKnowledgeDocument(input: {
  brand: string; doc_type: string; title: string; raw_content: string; source?: string;
}): Promise<{ ok: boolean; error?: string; chunks_inserted?: number }> {
  if (!input.title || !input.raw_content) return { ok: false, error: 'title and content required' };
  try {
    const r = await fetch(KNOWLEDGE_LOADER_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: input.brand || 'shared',
        doc_type: input.doc_type || 'other',
        source: input.source || 'cockpit_manual',
        title: input.title,
        raw_content: input.raw_content,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 200)}` };
    }
    const j = await r.json().catch(() => ({}));
    return { ok: true, chunks_inserted: j.chunks_inserted };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function deleteKnowledgeDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('knowledge_documents').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
