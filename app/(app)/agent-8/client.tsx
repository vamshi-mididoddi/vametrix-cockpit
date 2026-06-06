'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { updateDecisionStatus, runPerfAnalysis } from './actions';

function fmtINR(n: any) { if (n == null || isNaN(Number(n))) return '—'; return '₹' + Math.round(Number(n)).toLocaleString('en-IN'); }
function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

const HEALTH: Record<string, { label: string; color: string; bg: string; rank: number; icon: string }> = {
  kill:    { label: 'KILL',    color: 'text-rose-300',   bg: 'bg-rose-500/10 border-rose-500/30',   rank: 0, icon: '🛑' },
  fix:     { label: 'FIX',     color: 'text-amber-300',  bg: 'bg-amber-500/10 border-amber-500/30', rank: 1, icon: '🔧' },
  scale:   { label: 'SCALE',   color: 'text-accent-300', bg: 'bg-accent-500/10 border-accent-500/30', rank: 2, icon: '📈' },
  watch:   { label: 'WATCH',   color: 'text-sky-300',    bg: 'bg-sky-500/10 border-sky-500/30',     rank: 3, icon: '👀' },
  healthy: { label: 'HEALTHY', color: 'text-zinc-300',   bg: 'bg-zinc-700/20 border-zinc-700',      rank: 4, icon: '✓' },
};

function Trend({ label, pct, goodWhenDown }: { label: string; pct: number | null | undefined; goodWhenDown?: boolean }) {
  if (pct === null || pct === undefined) return null;
  const up = pct > 0;
  const good = goodWhenDown ? !up : up;
  const color = pct === 0 ? 'text-zinc-500' : good ? 'text-accent-400' : 'text-rose-400';
  return <span className={`text-[10px] ${color}`}>{label} {up ? '↑' : '↓'}{Math.abs(pct)}%</span>;
}

export function AgentEightClient({ initialDecs, ads, brief }: { initialDecs: any[]; ads: any[]; brief: any | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  function show(m: string, e = false) { setFeedback((e ? '✗ ' : '✓ ') + m); setTimeout(() => setFeedback(null), 4500); }

  function act(id: number, status: 'approved' | 'rejected') {
    startTransition(async () => {
      const r = await updateDecisionStatus(id, status);
      if (r.ok) { show(`Decision ${status}`); router.refresh(); } else show(r.error || 'failed', true);
    });
  }
  function analyze() {
    startTransition(async () => {
      show('Analyzing account — the marketer is thinking… (~30s)');
      const r = await runPerfAnalysis();
      if (r.ok) { show(`Analysis complete · ${r.decisions ?? 0} decisions`); setTimeout(() => router.refresh(), 800); }
      else show(r.error || 'failed', true);
    });
  }

  const b = brief?.detail || null;
  const pending_ = initialDecs.filter(d => d.approval_status === 'pending');
  const shown = tab === 'pending' ? pending_ : initialDecs;

  const sorted = useMemo(() => [...shown].sort((a, b2) => {
    const pa = a.current_state?.priority ?? 99, pb = b2.current_state?.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (HEALTH[a.current_state?.health]?.rank ?? 9) - (HEALTH[b2.current_state?.health]?.rank ?? 9);
  }), [shown]);

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Portfolio brief hero */}
      <div className={`rounded-xl border p-5 md:p-6 ${
        b?.overall === 'bleeding' ? 'bg-rose-500/5 border-rose-500/30' :
        b?.overall === 'needs_attention' ? 'bg-amber-500/5 border-amber-500/30' :
        b?.overall === 'scaling' ? 'bg-accent-500/5 border-accent-500/30' :
        'bg-bg-card border-bg-border'
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="section-title">Performance Marketer · portfolio brief</div>
            {b ? (
              <>
                <h2 className="text-lg md:text-xl font-semibold mt-1.5 leading-snug">{b.headline}</h2>
                <p className="text-[13px] text-zinc-400 mt-2 leading-relaxed max-w-3xl">{b.summary}</p>
                <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                  <span className="text-zinc-500">Blended CPL <span className="text-zinc-200 font-semibold">{fmtINR(b.blended_cpl_inr)}</span></span>
                  <span className="text-zinc-500">CPQL <span className="text-zinc-200 font-semibold">{fmtINR(b.blended_cpql_inr)}</span></span>
                  <span className="text-zinc-600">· {timeAgo(brief?.observed_at)}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-400 mt-2">No analysis yet. Tap "Analyze now" — the marketer reads 14 days of trends and tells you exactly what to do.</p>
            )}
          </div>
          <button onClick={analyze} disabled={pending} className="px-4 py-2 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50 shrink-0">
            {pending ? 'Thinking…' : '🧠 Analyze now'}
          </button>
        </div>
        {b?.top_moves?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="section-title mb-2">Top moves</div>
            <ol className="space-y-1.5">
              {b.top_moves.map((m: string, i: number) => (
                <li key={i} className="flex gap-2.5 text-[13px] text-zinc-300">
                  <span className="text-accent-400 font-mono shrink-0">{i + 1}.</span><span>{m}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {feedback && <div className={`mt-3 text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>}
      </div>

      {/* Decisions */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">
            Recommendations
            {pending_.length > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">{pending_.length} pending</span>}
          </h3>
          <div className="flex gap-1 bg-bg-card border border-bg-border rounded-md p-0.5">
            <button onClick={() => setTab('pending')} className={`px-3 py-1 text-[11px] rounded ${tab === 'pending' ? 'bg-accent-500/15 text-accent-300' : 'text-zinc-400 hover:text-zinc-200'}`}>Pending</button>
            <button onClick={() => setTab('all')} className={`px-3 py-1 text-[11px] rounded ${tab === 'all' ? 'bg-accent-500/15 text-accent-300' : 'text-zinc-400 hover:text-zinc-200'}`}>All</button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-bg-card border border-dashed border-bg-border rounded-xl p-10 text-center text-sm text-zinc-500">
            {tab === 'pending' ? 'No pending recommendations. Tap "Analyze now" for fresh insight.' : 'No decisions recorded yet.'}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(d => {
              const cs = d.current_state || {};
              const h = HEALTH[cs.health] || HEALTH.watch;
              const sig = cs.signals || {};
              const tr = sig.trends || {};
              const fl = sig.flags || {};
              const isPending = d.approval_status === 'pending';
              return (
                <div key={d.id} className={`rounded-xl border p-4 ${h.bg}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${h.color}`}>{h.icon} {h.label}</span>
                        <span className="text-[13px] font-semibold truncate">{d.campaign_name || d.campaign_id}</span>
                        {cs.confidence && <span className="text-[10px] text-zinc-500">· {cs.confidence} confidence</span>}
                        {cs.priority && <span className="text-[10px] text-zinc-600 font-mono">· P{cs.priority}</span>}
                      </div>
                      <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">{d.reason}</p>

                      {sig.last7d && (
                        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500">7d: {fmtINR(sig.last7d.spend)} · {sig.last7d.leads} leads · CPL {fmtINR(sig.last7d.cpl)}{sig.last7d.cpql ? ` · CPQL ${fmtINR(sig.last7d.cpql)}` : ''}</span>
                          <Trend label="CPL" pct={tr.cpl_pct} goodWhenDown />
                          <Trend label="CTR" pct={tr.ctr_pct} />
                          <Trend label="CPM" pct={tr.cpm_pct} goodWhenDown />
                          {fl.creative_fatigue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">creative fatigue</span>}
                          {fl.auction_saturation && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">saturation</span>}
                          {fl.learning_phase && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300">learning</span>}
                          {fl.zero_lead_streak_days > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">{fl.zero_lead_streak_days}d no leads</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {isPending ? (
                        <>
                          <button onClick={() => act(d.id, 'approved')} disabled={pending} className="px-3 py-1.5 text-[11px] rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">✓ Approve</button>
                          <button onClick={() => act(d.id, 'rejected')} disabled={pending} className="px-3 py-1.5 text-[11px] rounded bg-bg-soft text-zinc-400 border border-bg-border hover:border-bg-borderhover">✗ Dismiss</button>
                        </>
                      ) : (
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded font-mono ${
                          d.approval_status === 'approved' ? 'bg-accent-500/15 text-accent-300' :
                          d.approval_status === 'auto_executed' ? 'bg-violet-500/15 text-violet-300' :
                          'bg-zinc-700/30 text-zinc-500'
                        }`}>{d.approval_status}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-[10px] text-zinc-600 leading-relaxed">
        The Performance Marketer reads 14 days of trends (CPL · CTR · CPM · frequency · lead quality) every few hours and reasons like a senior media buyer.
        It only recommends — nothing executes until you approve. Approved scale/pause actions are picked up by Auto-Execute (#84).
      </div>
    </div>
  );
}
