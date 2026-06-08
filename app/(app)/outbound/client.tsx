'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign, addContacts, setCampaignStatus, runNow } from './actions';
import { BRAND_LABEL } from '@/lib/agents';

const BRAND_OPTS = ['mixed', 'dcal', 'dcal_hardwater', 'befach_diet', 'wellness', 'essentio', 'befach_imports', 'gcom'];

function fmt(iso?: string | null) { if (!iso) return '—'; return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); }

export function OutboundClient({ campaigns, templates, summaries }: { campaigns: any[]; templates: any[]; summaries: Record<number, any> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(campaigns.length === 0);

  // new campaign form
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('dcal');
  const [template, setTemplate] = useState(templates[0]?.template_name || '');
  const [cap, setCap] = useState(200);

  // contacts modal
  const [contactsFor, setContactsFor] = useState<number | null>(null);
  const [contactsRaw, setContactsRaw] = useState('');

  function show(m: string, e = false) { setFeedback((e ? '✗ ' : '✓ ') + m); setTimeout(() => setFeedback(null), 5000); }

  function doCreate() {
    if (!name.trim() || !template) { show('Name + template required', true); return; }
    startTransition(async () => {
      const r = await createCampaign({ name, brand, template_name: template, template_language: templates.find(t => t.template_name === template)?.language || 'en', daily_cap: cap });
      if (r.ok) { show(`Campaign created — now add contacts`); setName(''); setShowNew(false); setContactsFor(r.campaign_id); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }
  function doAddContacts() {
    if (!contactsFor || !contactsRaw.trim()) { show('Paste phone numbers', true); return; }
    startTransition(async () => {
      const r = await addContacts(contactsFor, contactsRaw);
      if (r.ok) { show(`Added ${r.added} contacts`); setContactsRaw(''); setContactsFor(null); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }
  function doStatus(id: number, status: 'active' | 'paused') {
    if (status === 'active' && !confirm('Launch this campaign? It will start sending WhatsApp templates to contacts (respecting opt-outs + daily cap).')) return;
    startTransition(async () => {
      const r = await setCampaignStatus(id, status);
      if (r.ok) { show(status === 'active' ? 'Campaign LIVE — sending begins within 5 min' : 'Paused'); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }
  function doRunNow() {
    startTransition(async () => {
      show('Sending a batch now…');
      const r = await runNow();
      if (r.ok) { show(`Sent ${r.sent ?? 0} · failed ${r.failed ?? 0}`); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      {/* Intro */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold">Hunt leads, don't just catch them</h2>
          <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">
            Upload a contact list → the engine sends a Meta-approved WhatsApp template in rate-limited batches (respecting opt-outs).
            Anyone who replies flows straight into the qualifier → router → your pipeline.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={doRunNow} disabled={pending} className="px-3 py-2 text-xs rounded-md bg-bg-soft border border-bg-border hover:border-bg-borderhover text-zinc-300">▶ Send batch now</button>
          <button onClick={() => setShowNew(s => !s)} className="px-3 py-2 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">
            {showNew ? '✕ Close' : '+ New campaign'}
          </button>
        </div>
      </div>

      {feedback && <div className={`text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>}

      {/* New campaign */}
      {showNew && (
        <div className="bg-bg-card border border-accent-500/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">New outbound campaign</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Campaign name"><input value={name} onChange={e => setName(e.target.value)} placeholder="DCal Hyderabad plumbers" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" /></Field>
            <Field label="Brand"><select value={brand} onChange={e => setBrand(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">{BRAND_OPTS.map(b => <option key={b} value={b}>{BRAND_LABEL[b] || b}</option>)}</select></Field>
            <Field label="Template (Meta-approved)">
              <select value={template} onChange={e => setTemplate(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
                {templates.length === 0 ? <option value="">no approved templates</option> : templates.map(t => <option key={t.template_name} value={t.template_name}>{t.template_name} ({t.language})</option>)}
              </select>
            </Field>
            <Field label="Daily cap"><input type="number" value={cap} onChange={e => setCap(Number(e.target.value) || 200)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" /></Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={doCreate} disabled={pending || !name.trim() || !template} className="px-4 py-2 text-sm rounded-md bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50">Create campaign</button>
            {templates.length === 0 && <span className="text-[11px] text-amber-400">No approved templates yet — submit one in WA Templates first.</span>}
          </div>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="bg-bg-card border border-dashed border-bg-border rounded-xl p-10 text-center text-sm text-zinc-500">No outbound campaigns yet.</div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const s = summaries[c.id] || {};
            const total = s.total || 0;
            const sent = s.sent || 0;
            const replied = s.replied || 0;
            const pendingC = s.pending || 0;
            const failed = s.failed || 0;
            const sentPct = total > 0 ? Math.round((sent / total) * 100) : 0;
            const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
            return (
              <div key={c.id} className="bg-bg-card border border-bg-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{c.name}</h3>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                        c.status === 'active' ? 'bg-accent-500/15 text-accent-300' :
                        c.status === 'paused' ? 'bg-amber-500/15 text-amber-300' :
                        c.status === 'done' ? 'bg-zinc-700/30 text-zinc-400' :
                        'bg-sky-500/15 text-sky-300'
                      }`}>{c.status}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{BRAND_LABEL[c.brand] || c.brand} · template <span className="font-mono">{c.template_name}</span> · cap {c.daily_cap}/day · {fmt(c.created_at)}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setContactsFor(c.id)} className="px-2.5 py-1.5 text-[11px] rounded bg-bg-soft border border-bg-border hover:border-bg-borderhover text-zinc-300">+ Contacts</button>
                    {c.status === 'active'
                      ? <button onClick={() => doStatus(c.id, 'paused')} disabled={pending} className="px-2.5 py-1.5 text-[11px] rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Pause</button>
                      : <button onClick={() => doStatus(c.id, 'active')} disabled={pending || total === 0} className="px-2.5 py-1.5 text-[11px] rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 disabled:opacity-40">🚀 Launch</button>}
                  </div>
                </div>

                {/* funnel */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                  <Stat label="Contacts" value={total} />
                  <Stat label="Pending" value={pendingC} />
                  <Stat label="Sent" value={sent} accent />
                  <Stat label="Replied" value={replied} accent={replied > 0} />
                  <Stat label="Failed" value={failed} warn={failed > 0} />
                </div>
                <div className="h-1.5 rounded-full bg-bg-soft overflow-hidden flex">
                  <div className="bg-accent-500 h-full" style={{ width: `${sentPct}%` }} title={`${sentPct}% sent`} />
                </div>
                <div className="text-[10px] text-zinc-600 mt-1.5">{sentPct}% sent · {replyRate}% reply rate{failed > 0 ? ` · ${failed} failed (check Meta billing/template)` : ''}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* contacts modal */}
      {contactsFor && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setContactsFor(null)} />
          <div className="relative z-10 w-full sm:max-w-lg bg-bg-card border border-bg-border rounded-t-2xl sm:rounded-2xl shadow-pop p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Add contacts</h3>
              <button onClick={() => setContactsFor(null)} className="text-zinc-500 hover:text-zinc-200 text-lg">✕</button>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">One per line. Format: <code className="font-mono">phone</code> or <code className="font-mono">phone,name</code>. 10-digit Indian numbers auto-prefix +91.</p>
            <textarea value={contactsRaw} onChange={e => setContactsRaw(e.target.value)} rows={10}
              placeholder={"9876543210, Ravi Kumar\n9988776655\n+919393939393, Builder Hyd"}
              className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-[12px] font-mono" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setContactsFor(null)} className="px-3 py-1.5 text-xs rounded bg-bg-soft border border-bg-border">Cancel</button>
              <button onClick={doAddContacts} disabled={pending || !contactsRaw.trim()} className="px-4 py-1.5 text-xs rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 disabled:opacity-50">Add contacts</button>
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] text-zinc-600 leading-relaxed">
        Sends respect opt-outs and the daily cap. Replies are auto-captured by the WhatsApp inbound agent → qualified → routed to a rep.
        Cold WhatsApp requires healthy Meta billing + an approved MARKETING template; failed sends show here with the reason.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (<div><label className="text-[10px] uppercase text-zinc-500 tracking-wider">{label}</label><div className="mt-1">{children}</div></div>);
}
function Stat({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-bg-soft border border-bg-border rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${accent ? 'text-accent-400' : warn ? 'text-rose-400' : ''}`}>{value}</div>
    </div>
  );
}
