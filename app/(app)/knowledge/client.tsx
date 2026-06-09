'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addKnowledgeDocument, deleteKnowledgeDocument } from './actions';
import { BRAND_LABEL } from '@/lib/agents';

// Our real verticals only. Use the segment in the title/content (e.g. "D'Cal — B2B Pricing").
const BRANDS = ['befach_diet', 'dcal', 'befach_imports', 'globalshopper', 'shared'];
const DOC_TYPES = ['product', 'pricing', 'policy', 'objection', 'faq', 'brand_voice', 'd2c', 'b2b', 'other'];

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export function KnowledgeClient({ initialDocs, chunkCount }: { initialDocs: any[]; chunkCount: number }) {
  const [docs, setDocs] = useState(initialDocs);
  const [showForm, setShowForm] = useState(false);
  const [brand, setBrand] = useState('shared');
  const [docType, setDocType] = useState('product');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterBrand, setFilterBrand] = useState('all');
  const router = useRouter();

  const visible = filterBrand === 'all' ? docs : docs.filter(d => d.brand === filterBrand);

  function submit() {
    if (!title || !content) { setFeedback('title and content required'); return; }
    setFeedback(null);
    startTransition(async () => {
      const r = await addKnowledgeDocument({ brand, doc_type: docType, title, raw_content: content });
      if (r.ok) {
        setFeedback(`✓ added · ${r.chunks_inserted ?? '?'} chunks embedded`);
        setTitle(''); setContent('');
        router.refresh();
        setTimeout(() => { setShowForm(false); setFeedback(null); }, 3000);
      } else {
        setFeedback('✗ ' + (r.error || 'failed'));
      }
    });
  }

  function del(id: string) {
    if (!confirm('Delete this document and its embeddings?')) return;
    startTransition(async () => {
      const r = await deleteKnowledgeDocument(id);
      if (r.ok) {
        setDocs(prev => prev.filter(d => d.id !== id));
        router.refresh();
      } else {
        alert('Failed: ' + r.error);
      }
    });
  }

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Documents" value={String(docs.length)} />
        <Kpi label="Chunks (embedded)" value={String(chunkCount)} />
        <Kpi label="Brands covered" value={String(new Set(docs.map(d => d.brand)).size)} />
        <Kpi label="Doc types" value={String(new Set(docs.map(d => d.doc_type)).size)} />
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Knowledge documents</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">RAG source for the WhatsApp qualifier · pgvector + HNSW · semantic search</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">
          {showForm ? '✕ Close' : '+ New document'}
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-card border border-bg-border rounded-lg p-5 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-[10px] uppercase text-slate-500 tracking-wider">Brand</label>
              <select value={brand} onChange={e => setBrand(e.target.value)}
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
                {BRANDS.map(b => <option key={b} value={b}>{BRAND_LABEL[b] || b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 tracking-wider">Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] uppercase text-slate-500 tracking-wider">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dcal RO Water Softener — Pricing 2026"
              className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
          </div>
          <div className="mb-3">
            <label className="text-[10px] uppercase text-slate-500 tracking-wider">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
              placeholder="Paste the full document text. It'll be chunked + embedded + indexed for the qualifier to retrieve."
              className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={pending || !title || !content}
              className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? 'Embedding…' : 'Add document'}
            </button>
            {feedback && <span className={`text-xs ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</span>}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 mb-3 flex-wrap">
        <button onClick={() => setFilterBrand('all')}
          className={`px-2.5 py-1 text-[11px] rounded-md border ${filterBrand === 'all' ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-bg-card text-slate-400 border-bg-border hover:border-bg-borderhover'}`}>
          all ({docs.length})
        </button>
        {Array.from(new Set(docs.map(d => d.brand))).map(b => (
          <button key={b} onClick={() => setFilterBrand(b)}
            className={`px-2.5 py-1 text-[11px] rounded-md border ${filterBrand === b ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-bg-card text-slate-400 border-bg-border hover:border-bg-borderhover'}`}>
            {BRAND_LABEL[b] || b} ({docs.filter(d => d.brand === b).length})
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-soft border-b border-bg-border">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="text-left py-2 px-3">Title</th>
              <th className="text-left py-2 px-3">Brand</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Source</th>
              <th className="text-right py-2 px-3">Updated</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500 text-sm">No documents in this filter.</td></tr>
            ) : visible.map(d => (
              <tr key={d.id} className="border-b border-bg-border hover:bg-bg-cardhover">
                <td className="py-2 px-3 text-xs">
                  <details>
                    <summary className="cursor-pointer hover:text-accent-300">{d.title}</summary>
                    <pre className="mt-2 text-[10px] bg-bg-soft border border-bg-border rounded p-2 overflow-x-auto text-slate-300 whitespace-pre-wrap max-h-60">{d.raw_content}</pre>
                  </details>
                </td>
                <td className="py-2 px-3 text-[11px]">{BRAND_LABEL[d.brand] || d.brand || '—'}</td>
                <td className="py-2 px-3 text-[11px] text-slate-400">{d.doc_type || '—'}</td>
                <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">{d.source || '—'}</td>
                <td className="py-2 px-3 text-[11px] text-right text-slate-500">{timeAgo(d.created_at)} ago</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => del(d.id)} disabled={pending}
                    className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="grad-card border border-bg-border rounded-lg p-3">
      <div className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
