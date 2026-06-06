'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  runEyesNow, runVoiceNow, resolveObservation, resolveAllObservations,
  getAgentExecutions, restartWorkflow, rerunAgent,
} from './actions';

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}
function timeAgo(iso?: string | null) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string; rank: number }> = {
  DOWN:        { label: 'DOWN',     color: 'text-rose-400',   bg: 'bg-rose-500/15',   border: 'border-rose-500/40',   dot: 'bg-rose-500',   rank: 0 },
  STUCK:       { label: 'STUCK',    color: 'text-rose-300',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   dot: 'bg-rose-500',   rank: 1 },
  DEGRADED:    { label: 'DEGRADED', color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-500',  rank: 2 },
  NO_ACTIVITY: { label: 'IDLE',     color: 'text-zinc-400',   bg: 'bg-zinc-700/20',   border: 'border-zinc-700',      dot: 'bg-zinc-500',   rank: 3 },
  UNKNOWN:     { label: 'UNKNOWN',  color: 'text-zinc-500',   bg: 'bg-zinc-800/20',   border: 'border-zinc-800',      dot: 'bg-zinc-600',   rank: 4 },
  HEALTHY:     { label: 'HEALTHY',  color: 'text-accent-300', bg: 'bg-accent-500/10', border: 'border-accent-500/30', dot: 'bg-accent-500', rank: 5 },
};

type SortKey = 'severity' | 'name' | 'recent' | 'fleet';

export function CeoClient({ state, observations, summary, latestDigest }: {
  state: any[]; observations: any[]; summary: any | null; latestDigest: any | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [filter, setFilter] = useState<'all' | 'issues' | string>('all');
  const [troubleshoot, setTroubleshoot] = useState<any | null>(null);

  function show(msg: string, err = false) {
    setFeedback((err ? '✗ ' : '✓ ') + msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  function doEyes() {
    startTransition(async () => {
      show('Running engine scan…');
      const r = await runEyesNow();
      if (r.ok) { show(`Classified ${r.agents_classified || 0} agents · ${r.observations_recorded || 0} new`); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }
  function doVoice() {
    startTransition(async () => {
      show('Generating digest…');
      const r = await runVoiceNow();
      if (r.ok) { show('Digest generated'); router.refresh(); } else show(r.error || 'failed', true);
    });
  }
  function doResolve(id: number) {
    startTransition(async () => { const r = await resolveObservation(id); if (r.ok) router.refresh(); else show(r.error || 'failed', true); });
  }
  function doResolveAll() {
    startTransition(async () => { const r = await resolveAllObservations(); if (r.ok) { show('Cleared all'); router.refresh(); } else show(r.error || 'failed', true); });
  }

  const overall = summary?.overall_status || 'IDLE';
  const overallColor = overall === 'CRITICAL' ? 'text-rose-400' : overall === 'NEEDS_ATTENTION' ? 'text-amber-400' : overall === 'HEALTHY' ? 'text-accent-400' : 'text-zinc-400';
  const overallBg = overall === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' : overall === 'NEEDS_ATTENTION' ? 'bg-amber-500/10 border-amber-500/30' : overall === 'HEALTHY' ? 'bg-accent-500/10 border-accent-500/30' : 'bg-bg-card border-bg-border';

  const digest = latestDigest?.detail || null;
  const fleets = useMemo(() => Array.from(new Set(state.map(s => s.agent_fleet).filter(Boolean))), [state]);

  const visibleAgents = useMemo(() => {
    let arr = [...state];
    if (filter === 'issues') arr = arr.filter(a => ['DOWN', 'STUCK', 'DEGRADED'].includes(a.status));
    else if (filter !== 'all') arr = arr.filter(a => a.agent_fleet === filter);
    arr.sort((a, b) => {
      if (sortKey === 'severity') return (STATUS_META[a.status]?.rank ?? 9) - (STATUS_META[b.status]?.rank ?? 9);
      if (sortKey === 'name') return (a.agent_name || '').localeCompare(b.agent_name || '');
      if (sortKey === 'recent') return new Date(b.last_execution_at || 0).getTime() - new Date(a.last_execution_at || 0).getTime();
      if (sortKey === 'fleet') return (a.agent_fleet || '').localeCompare(b.agent_fleet || '') || (a.agent_id || '').localeCompare(b.agent_id || '');
      return 0;
    });
    return arr;
  }, [state, filter, sortKey]);

  const issueCount = state.filter(a => ['DOWN', 'STUCK', 'DEGRADED'].includes(a.status)).length;

  return (
    <div className="max-w-[1500px] space-y-5">
      {/* Hero */}
      <div className={`border rounded-xl p-5 md:p-6 ${overallBg}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="section-title">Engine state</div>
            <div className={`text-2xl md:text-3xl font-semibold mt-1 ${overallColor}`}>{overall.replace('_', ' ')}</div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {summary?.healthy_count || 0} healthy · {summary?.degraded_count || 0} degraded · {summary?.stuck_count || 0} stuck · {summary?.down_count || 0} down · {summary?.no_activity_count || 0} idle
            </div>
            <div className="text-[10px] text-zinc-600 mt-2">Last scan {timeAgo(summary?.last_eyes_run)} · Last digest {timeAgo(summary?.last_voice_run)}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={doEyes} disabled={pending} className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">👁 Scan now</button>
            <button onClick={doVoice} disabled={pending} className="px-3 py-1.5 text-xs rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50">🧠 Run digest</button>
          </div>
        </div>
        {feedback && <div className={`mt-3 text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>}
      </div>

      {/* Digest */}
      {digest && (
        <div className="bg-bg-card border border-violet-500/30 rounded-xl p-5">
          <div className="flex items-start justify-between mb-2 gap-3 flex-wrap">
            <div>
              <div className="section-title text-violet-300">CEO Voice · {fmt(latestDigest?.observed_at)}</div>
              <h3 className="text-base font-semibold mt-1">{digest.headline || 'Digest'}</h3>
            </div>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${digest.overall_severity === 'critical' ? 'bg-rose-500/15 text-rose-300' : digest.overall_severity === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-zinc-700/30 text-zinc-400'}`}>{digest.overall_severity || 'info'}</span>
          </div>
          {digest.summary && <p className="text-xs text-zinc-300 italic">{digest.summary}</p>}
          {Array.isArray(digest.recommended_actions) && digest.recommended_actions.length > 0 && (
            <div className="mt-3">
              <div className="section-title mb-1.5">Recommended actions</div>
              <div className="space-y-1.5">
                {digest.recommended_actions.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.urgency === 'critical' ? 'bg-rose-500' : a.urgency === 'warning' ? 'bg-amber-500' : 'bg-accent-500'}`} />
                    <div><span className="text-zinc-200 font-medium">{a.action}</span>{a.target && <span className="text-zinc-500"> · #{a.target}</span>}{a.why && <span className="text-zinc-500"> — {a.why}</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open observations */}
      {observations.length > 0 && (
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Open issues ({observations.length})</h3>
            <button onClick={doResolveAll} disabled={pending} className="text-[10px] px-2.5 py-1 rounded bg-bg-soft border border-bg-border hover:border-accent-500/30 hover:text-accent-300">✓ Resolve all</button>
          </div>
          <div className="space-y-1.5">
            {observations.slice(0, 20).map(o => (
              <div key={o.id} className={`flex items-start gap-3 px-3 py-2 rounded border ${o.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' : o.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-bg-border bg-bg-soft'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${o.severity === 'critical' ? 'bg-rose-500' : o.severity === 'warning' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-zinc-200">{o.summary}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{o.agent_id && <span className="font-mono mr-2">#{o.agent_id}</span>}<span className="uppercase tracking-wider mr-2">{o.observation_kind}</span><span>{fmt(o.observed_at)}</span></div>
                </div>
                <button onClick={() => doResolve(o.id)} disabled={pending} className="text-[10px] px-2 py-0.5 rounded bg-bg-card border border-bg-border hover:border-accent-500/30 hover:text-accent-300 shrink-0">✓</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent grid + toolbar */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Agents ({visibleAgents.length})</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">Tap any agent to inspect &amp; troubleshoot</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-bg-soft border border-bg-border rounded-md p-0.5">
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>All</Chip>
              <Chip active={filter === 'issues'} onClick={() => setFilter('issues')} danger={issueCount > 0}>Issues {issueCount > 0 ? `(${issueCount})` : ''}</Chip>
            </div>
            <select value={typeof filter === 'string' && fleets.includes(filter) ? filter : ''} onChange={e => setFilter(e.target.value || 'all')} className="text-[11px] bg-bg-soft border border-bg-border rounded-md px-2 py-1.5">
              <option value="">All systems</option>
              {fleets.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="text-[11px] bg-bg-soft border border-bg-border rounded-md px-2 py-1.5">
              <option value="severity">Sort: Issues first</option>
              <option value="name">Sort: Name</option>
              <option value="recent">Sort: Recently active</option>
              <option value="fleet">Sort: System</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {visibleAgents.map((a: any) => {
            const m = STATUS_META[a.status] || STATUS_META.UNKNOWN;
            const needsAttention = ['DOWN', 'STUCK', 'DEGRADED'].includes(a.status);
            return (
              <button key={a.agent_id} onClick={() => setTroubleshoot(a)}
                className={`text-left border rounded-lg p-3 transition hover:border-bg-borderhover ${m.bg} ${m.border} ${needsAttention ? 'glow-hot' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-zinc-500">#{a.agent_id}</div>
                    <div className="text-[13px] font-medium truncate">{a.agent_name}</div>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${m.dot} ${needsAttention ? 'animate-pulse' : ''}`} />
                </div>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${m.color}`}>{m.label}</div>
                {a.issue_summary && <div className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{a.issue_summary}</div>}
                <div className="text-[10px] text-zinc-600 mt-1.5 flex items-center justify-between">
                  {a.primary_metric_label && <span>{a.primary_metric_value ?? '—'} {a.primary_metric_label}</span>}
                  <span>{timeAgo(a.last_execution_at)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {visibleAgents.length === 0 && (
          <div className="text-center py-10 text-sm text-zinc-500">
            {state.length === 0 ? 'No agent state yet — tap 👁 Scan now.' : 'No agents match this filter.'}
          </div>
        )}
      </div>

      {troubleshoot && <TroubleshootModal agent={troubleshoot} onClose={() => setTroubleshoot(null)} />}
    </div>
  );
}

function Chip({ active, onClick, children, danger }: { active: boolean; onClick: () => void; children: any; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 text-[11px] rounded ${active ? (danger ? 'bg-rose-500/15 text-rose-300' : 'bg-accent-500/15 text-accent-300') : 'text-zinc-400 hover:text-zinc-200'}`}>{children}</button>
  );
}

function TroubleshootModal({ agent, onClose }: { agent: any; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [execs, setExecs] = useState<any[] | null>(null);
  const [n8nUrl, setN8nUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const wfId = agent?.metadata?.wf_id || null;
  const m = STATUS_META[agent.status] || STATUS_META.UNKNOWN;

  function localShow(t: string, err = false) { setMsg((err ? '✗ ' : '✓ ') + t); setTimeout(() => setMsg(null), 4000); }

  function inspect() {
    startTransition(async () => {
      const r = await getAgentExecutions(wfId);
      if (r.ok) { setExecs(r.executions || []); setN8nUrl(r.n8n_url || null); } else localShow(r.error || 'failed', true);
    });
  }
  function restart() {
    if (!confirm(`Restart ${agent.agent_name}? Re-arms its trigger (deactivate + activate).`)) return;
    startTransition(async () => { const r = await restartWorkflow(wfId); if (r.ok) { localShow('Restarted — trigger re-armed'); router.refresh(); } else localShow(r.error || 'failed', true); });
  }
  function rerun() {
    startTransition(async () => { const r = await rerunAgent(agent.agent_id); if (r.ok) { localShow('Re-run triggered'); router.refresh(); } else localShow(r.error || 'failed', true); });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-bg-card border border-bg-border rounded-t-2xl sm:rounded-2xl shadow-pop max-h-[90vh] overflow-y-auto scrollbar animate-slide-up">
        <div className="sticky top-0 glass border-b border-bg-border px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono text-zinc-500">#{agent.agent_id} · {agent.agent_fleet}</div>
            <h3 className="text-base font-semibold tracking-tight">{agent.agent_name}</h3>
            <span className={`inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${m.bg} ${m.color}`}>{m.label}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-bg-soft border border-bg-border rounded-lg p-3 text-xs space-y-1.5">
            {agent.issue_summary && <div className="flex gap-2"><span className="text-zinc-500 shrink-0 w-24">Issue:</span><span className="text-zinc-200">{agent.issue_summary}</span></div>}
            <div className="flex gap-2"><span className="text-zinc-500 shrink-0 w-24">Last run:</span><span className="text-zinc-300">{timeAgo(agent.last_execution_at)} ({agent.last_execution_status || 'n/a'})</span></div>
            {agent.primary_metric_label && <div className="flex gap-2"><span className="text-zinc-500 shrink-0 w-24">{agent.primary_metric_label}:</span><span className="text-zinc-300">{agent.primary_metric_value ?? '—'}</span></div>}
            <div className="flex gap-2"><span className="text-zinc-500 shrink-0 w-24">Workflow:</span><span className="text-zinc-300 font-mono text-[10px] truncate">{wfId || 'not deployed'}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ActionBtn onClick={inspect} disabled={pending || !wfId} label="🔍 Inspect runs" />
            <ActionBtn onClick={rerun} disabled={pending} label="▶ Re-run now" />
            <ActionBtn onClick={restart} disabled={pending || !wfId} label="↻ Restart" warn />
            {n8nUrl ? (
              <a href={n8nUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-3 py-2.5 text-xs rounded-md bg-bg-soft border border-bg-border hover:border-bg-borderhover text-zinc-300">↗ Open in n8n</a>
            ) : (
              <ActionBtn onClick={inspect} disabled={pending || !wfId} label="↗ Get n8n link" />
            )}
          </div>

          {msg && <div className={`text-[11px] ${msg.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{msg}</div>}

          {execs !== null && (
            <div>
              <div className="section-title mb-2">Last {execs.length} executions</div>
              {execs.length === 0 ? (
                <div className="text-[11px] text-zinc-500 italic">No executions recorded.</div>
              ) : (
                <div className="space-y-1">
                  {execs.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-bg-soft border border-bg-border text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.status === 'success' ? 'bg-accent-500' : e.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span className={`uppercase tracking-wider font-mono ${e.status === 'error' ? 'text-rose-300' : e.status === 'success' ? 'text-accent-300' : 'text-amber-300'}`}>{e.status}</span>
                      <span className="text-zinc-500 ml-auto">{fmt(e.startedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] text-zinc-600 leading-relaxed border-t border-bg-border pt-3">
            <strong className="text-zinc-500">Inspect</strong> = recent runs + errors · <strong className="text-zinc-500">Re-run</strong> = on-demand trigger (scan/digest/audit) · <strong className="text-zinc-500">Restart</strong> = re-arm a stuck schedule.
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, label, warn }: { onClick: () => void; disabled?: boolean; label: string; warn?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center px-3 py-2.5 text-xs rounded-md border transition disabled:opacity-40 ${warn ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' : 'bg-bg-soft text-zinc-300 border-bg-border hover:border-bg-borderhover'}`}>{label}</button>
  );
}
