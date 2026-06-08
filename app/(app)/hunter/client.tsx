'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runHunt, pushToOutbound, dismissDiscovered } from './actions';
import { BRAND_LABEL } from '@/lib/agents';

const BRAND_OPTS = ['mixed', 'dcal', 'dcal_hardwater', 'befach_diet', 'wellness', 'essentio', 'befach_imports', 'gcom'];
const VERTICAL_PRESETS = [
  'restaurants & cafes', 'hotels', 'gyms & fitness centres', 'clinics & hospitals',
  'salons & spas', 'hardware & plumbing shops', 'schools', 'supermarkets', 'pharmacies',
];

export function HunterClient({ discovered, hunts, templates }: { discovered: any[]; hunts: any[]; templates: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const [vertical, setVertical] = useState(VERTICAL_PRESETS[0]);
  const [geo, setGeo] = useState('Hyderabad');
  const [count, setCount] = useState(40);
  const [brand, setBrand] = useState('dcal');

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pushOpen, setPushOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [template, setTemplate] = useState(templates[0]?.template_name || '');

  function show(m: string, e = false) { setFeedback((e ? '✗ ' : '✓ ') + m); setTimeout(() => setFeedback(null), 6000); }
  function toggle(id: number) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function allWithPhone() { return discovered.filter(d => d.phone).map(d => d.id); }
  function selectAllPhone() { setSelected(new Set(allWithPhone())); }

  function doHunt() {
    if (!vertical.trim() || !geo.trim()) { show('Vertical + geo required', true); return; }
    startTransition(async () => {
      show(`Hunting ${vertical} in ${geo}… (10-40s)`);
      const r = await runHunt({ vertical, geo, count, brand });
      if (r.ok) { show(`Found ${r.found} businesses · ${r.with_phone} with phone`); router.refresh(); }
      else show(r.error || 'hunt failed', true);
    });
  }
  function doPush() {
    const ids = [...selected].filter(id => discovered.find(d => d.id === id && d.phone));
    if (ids.length === 0) { show('Select contacts that have a phone', true); return; }
    if (!campName.trim() || !template) { show('Campaign name + template required', true); return; }
    startTransition(async () => {
      const r = await pushToOutbound({ contact_ids: ids, campaign_name: campName, brand, template_name: template, template_language: templates.find(t => t.template_name === template)?.language || 'en' });
      if (r.ok) { show(`Created draft campaign with ${r.added} contacts → go to Outbound to launch`); setPushOpen(false); setSelected(new Set()); setCampName(''); router.refresh(); }
      else show(r.error || 'push failed', true);
    });
  }
  function doDismiss() {
    const ids = [...selected];
    if (!ids.length) return;
    startTransition(async () => {
      const r = await dismissDiscovered(ids);
      if (r.ok) { show(`Dismissed ${ids.length}`); setSelected(new Set()); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  const withPhone = discovered.filter(d => d.phone).length;

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* Hunt form */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="max-w-xl">
            <h2 className="text-sm font-semibold">Find real buyers automatically</h2>
            <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
              Pick a business type + city. The engine searches OpenStreetMap for real businesses, extracts their phone numbers,
              and stages them here. Review → push the good ones into an Outbound campaign.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">Business type (vertical)</label>
            <input list="vpresets" value={vertical} onChange={e => setVertical(e.target.value)}
              className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" placeholder="restaurants, gyms, clinics…" />
            <datalist id="vpresets">{VERTICAL_PRESETS.map(v => <option key={v} value={v} />)}</datalist>
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">City / area</label>
            <input value={geo} onChange={e => setGeo(e.target.value)} className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" placeholder="Hyderabad" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">Brand</label>
            <select value={brand} onChange={e => setBrand(e.target.value)} className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
              {BRAND_OPTS.map(b => <option key={b} value={b}>{BRAND_LABEL[b] || b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">Max results</label>
            <input type="number" value={count} onChange={e => setCount(Number(e.target.value) || 40)} className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={doHunt} disabled={pending} className="px-4 py-2 text-sm rounded-md bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50 font-medium">
            {pending ? 'Hunting…' : '🔍 Hunt buyers'}
          </button>
          {feedback && <span className={`text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</span>}
        </div>
        <div className="mt-2 text-[10px] text-zinc-600">
          Tip: phone coverage on OpenStreetMap is partial — for richer phone data, add a Google Places API key (one env var) and I'll switch the source.
        </div>
      </div>

      {/* Recent hunts */}
      {hunts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {hunts.map(h => (
            <div key={h.id} className="text-[10px] bg-bg-soft border border-bg-border rounded px-2.5 py-1.5">
              <span className="text-zinc-300">{h.vertical}</span> · {h.geo} · <span className="text-accent-400">{h.with_phone}/{h.found}</span> w/ phone
            </div>
          ))}
        </div>
      )}

      {/* Discovered contacts */}
      <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold">Discovered contacts <span className="text-zinc-500 font-normal">({discovered.length} staged · {withPhone} with phone)</span></div>
          <div className="flex gap-2">
            <button onClick={selectAllPhone} className="px-2.5 py-1.5 text-[11px] rounded bg-bg-soft border border-bg-border text-zinc-300">Select all w/ phone</button>
            <button onClick={doDismiss} disabled={pending || selected.size === 0} className="px-2.5 py-1.5 text-[11px] rounded bg-bg-soft border border-bg-border text-zinc-400 disabled:opacity-40">Dismiss</button>
            <button onClick={() => { if (selected.size === 0) { show('Select some contacts first', true); return; } setCampName(`${vertical} · ${geo}`); setPushOpen(true); }} disabled={pending || selected.size === 0}
              className="px-3 py-1.5 text-[11px] rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 disabled:opacity-40 font-medium">
              Send {selected.size > 0 ? `${selected.size} ` : ''}to Outbound →
            </button>
          </div>
        </div>
        {discovered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">No staged contacts. Run a hunt above to discover buyers.</div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto scrollbar">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-bg-card border-b border-bg-border text-[10px] uppercase tracking-wider text-zinc-500">
                <tr><th className="w-8 py-2"></th><th className="text-left px-2 py-2">Business</th><th className="text-left px-2 py-2">Phone</th><th className="text-left px-2 py-2">Type</th><th className="text-left px-2 py-2 hidden md:table-cell">Address</th></tr>
              </thead>
              <tbody>
                {discovered.map(d => (
                  <tr key={d.id} className={`border-b border-bg-border/50 hover:bg-white/[0.02] ${selected.has(d.id) ? 'bg-accent-500/5' : ''}`}>
                    <td className="text-center"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} disabled={!d.phone} className="accent-accent-500" /></td>
                    <td className="px-2 py-2 font-medium text-zinc-200">{d.name}{d.website && <a href={d.website} target="_blank" rel="noreferrer" className="ml-1.5 text-accent-500 text-[10px]">↗</a>}</td>
                    <td className="px-2 py-2 font-mono">{d.phone ? <span className={d.meta?.likely_mobile ? 'text-accent-400' : 'text-zinc-400'}>+{d.phone}{d.meta?.likely_mobile ? '' : ' ☎'}</span> : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-2 py-2 text-zinc-400">{d.category}</td>
                    <td className="px-2 py-2 text-zinc-500 hidden md:table-cell truncate max-w-[280px]">{d.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2 text-[10px] text-zinc-600 border-t border-bg-border">☎ = landline (may not have WhatsApp) · green = likely mobile. Only phone-bearing rows can be selected.</div>
      </div>

      {/* push modal */}
      {pushOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPushOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-bg-card border border-bg-border rounded-t-2xl sm:rounded-2xl shadow-pop p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Send {selected.size} contacts to Outbound</h3>
              <button onClick={() => setPushOpen(false)} className="text-zinc-500 hover:text-zinc-200 text-lg">✕</button>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Creates a <b>draft</b> Outbound campaign with these contacts. You launch it from the Outbound page after reviewing.</p>
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">Campaign name</label>
            <input value={campName} onChange={e => setCampName(e.target.value)} className="mt-1 mb-3 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
            <label className="text-[10px] uppercase text-zinc-500 tracking-wider">Template (Meta-approved)</label>
            <select value={template} onChange={e => setTemplate(e.target.value)} className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
              {templates.length === 0 ? <option value="">no approved templates</option> : templates.map(t => <option key={t.template_name} value={t.template_name}>{t.template_name} ({t.language})</option>)}
            </select>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPushOpen(false)} className="px-3 py-1.5 text-xs rounded bg-bg-soft border border-bg-border">Cancel</button>
              <button onClick={doPush} disabled={pending || !campName.trim() || !template} className="px-4 py-1.5 text-xs rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 disabled:opacity-50">Create draft campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
