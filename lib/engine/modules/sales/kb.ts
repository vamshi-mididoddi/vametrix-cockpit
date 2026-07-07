// S-05 â€” Knowledge loader: text/FAQ in â†’ chunks + embeddings in pgvector.
// v0 accepts raw text (and pre-extracted PDF text); native PDF parsing rides
// on the media pipeline in S-02.
import { db, must } from '../../lib/db';
import { embed } from '../../lib/llm';
import type { Org } from '../../kernel/tenants';

const CHUNK_CHARS = 3200; // ~800 tokens
const OVERLAP = 400;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, '').trim();
  if (clean.length <= CHUNK_CHARS) return clean ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_CHARS, clean.length);
    if (end < clean.length) {
      // Prefer to break on a paragraph, then a sentence, inside the last 20%.
      const window = clean.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('. '));
      if (breakAt > CHUNK_CHARS * 0.8) end = start + breakAt + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - OVERLAP;
  }
  return chunks.filter(Boolean);
}

export async function loadDocument(org: Org, doc: {
  title: string;
  content: string;
  source_type?: string;
  metadata?: Record<string, any>;
}): Promise<{ documentId: string; chunks: number }> {
  const row = must(
    await db.from('sales_kb_documents').insert({
      org_id: org.id,
      title: doc.title,
      source_type: doc.source_type ?? 'manual_entry',
      metadata: doc.metadata ?? {},
      status: 'pending',
    }).select('id').single(),
    'insert kb document',
  );

  try {
    const chunks = chunkText(doc.content);
    if (!chunks.length) throw new Error('document has no content after cleaning');
    // Embed in batches of 32 to stay well under request limits.
    for (let i = 0; i < chunks.length; i += 32) {
      const batch = chunks.slice(i, i + 32);
      const vectors = await embed(batch);
      const rows = batch.map((content, j) => ({
        org_id: org.id,
        document_id: row.id,
        content,
        embedding: JSON.stringify(vectors[j]),
        metadata: { chunk_index: i + j, title: doc.title },
      }));
      const { error } = await db.from('sales_kb_chunks').insert(rows);
      if (error) throw new Error(`insert chunks: ${error.message}`);
    }
    await db.from('sales_kb_documents').update({ status: 'indexed' }).eq('id', row.id);
    return { documentId: row.id, chunks: chunks.length };
  } catch (e) {
    await db.from('sales_kb_documents').update({ status: 'failed' }).eq('id', row.id);
    throw e;
  }
}

export async function searchKb(orgId: string, query: string, count = 6): Promise<Array<{ content: string; similarity: number }>> {
  const [vector] = await embed([query]);
  const { data, error } = await db.rpc('sales_match_kb_chunks', {
    p_org_id: orgId,
    p_query_embedding: JSON.stringify(vector),
    p_match_count: count,
  });
  if (error) throw new Error(`kb search: ${error.message}`);
  return (data ?? []).map((r: any) => ({ content: r.content, similarity: r.similarity }));
}
