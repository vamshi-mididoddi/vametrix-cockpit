'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runEyesNow, runVoiceNow, resolveObservation } from './actions';

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

const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string; dot: string }> = {
  HEALTHY:     { label: 'HEALTHY',     color: 'text-accent-300', bg: 'bg-accent-500/10', border: 'border-accent-500/30', dot: 'bg-accent-500' },
  DEGRADED:    { label: 'DEGRADED',    color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-500' },
  STUCK:       { label: 'STUCK',       color: 'text-rose-300',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   dot: 'bg-rose-500' },
  DOWN:        { label: 'DOWN',        color: 'text-rose-400',   bg: 'bg-rose-500/15',   border: 'border-rose-500/40',   dot: 'bg-rose-500' },
  NO_ACTIVITY: { label: 'IDLE',        color: 'text-slate-400',  bg: 'bg-slate-700/30',  border: 'border-slate-700',     dot: 'bg-slate-500' },
  UNKNOWN:     { label: 'UNKNOWN',     color: 'text-slate-500',  bg: 'bg-slate-800/30',  border: 'border-slate-800',     dot: 'bg-slate-600' },
};

export function CeoClient({ state, observations, summary, latestDigest }: {
  state: any[]; observations: any[]; summary: any | null; latestDigest: any | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function show(msg: string, err = false) {
    setFeedback((err ? '✗ ' : '✓ ') + msg);
    setTimeout(() => setFeedback(null), 4000);
  }

  function doEyes() {
    startTransition(async () => {
      show('Running CEO Eyes scan…');
      const r = await runEyesNow();
      if (r.ok) { show(`Classified ${r.agents_classified || 0} agents · ${r.observations_recorded || 0} new observations`); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function doVoice() {
    startTransition(async () => {
      show('Running CEO Voice synthesis…');
      const r = await runVoiceNow();
      if (r.ok) { show('Digest generated'); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function doResolve(id: number) {
    startTransition(async () => {
      const r = await resolveObservation(id);
      if (r.ok) router.refresh();
      else show(r.error || 'failed', true);
    });
  }

  const overall = summary?.overall_status || 'IDLE';
  const overallColor = overall === 'CRITICAL' ? 'text-rose-400' : overall === 'NEEDS_ATTENTION' ? 'text-amber-400' : overall === 'HEALTHY' ? 'text-accent-400' : 'text-slate-400';
  const overallBg = overall === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30' : overall === 'NEEDS_ATTENTION' ? 'bg-amber-500/10 border-amber-500/30' : overall === 'HEALTHY' ? 'bg-accent-500/10 border-accent-500/30' : 'bg-slate-800/30 border-slate-700';

  const byFleet: Record<string, any[]> = {};
  for (const s of state) {
    const f = s.agent_fleet || 'Other';
    if (!byFleet[f]) byFleet[f] = [];
    byFleet[f].push(s);
  }

  const digest = latestDigest?.detail || null;

  return (
    <div className="max-w-[1500px] space-y-5">
      {/* Hero — overall engine state */}
      <div className={`border rounded-lg p-6 ${overallBg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Engine state</div>
            <div className={`text-3xl font-semibold mt-1 ${overallColor}`}>{overall.replace('_', ' ')}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {summary?.healthy_count || 0} healthy · {summary?.degraded_count || 0} degraded · {summary?.stuck_count || 0} stuck · {summary?.down_count || 0} down · {summary?.no_activity_count || 0} idle
            </div>
            <div className="text-[10px] text-slate-600 mt-2">
              Last Eyes scan: {timeAgo(summary?.last_eyes_run)} · Last Voice digest: {timeAgo(summary?.last_voice_run)}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={doEyes} disabled={pending} className="px-3 py-1.5 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? '…' : '👁  Scan now'}
            </button>
            <button onClick={doVoice} disabled={pending} className="px-3 py-1.5 text-xs rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50">
              {pending ? '…' : '🧠 Run digest'}
            </button>
          </div>
        </div>
        {feedback && (
          <div className={`mt-3 text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>
        )}
      </div>

      {/* Latest LLM digest */}
      {digest && (
        <div className="bg-bg-card border border-violet-500/30 rounded-lg p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-violet-300">CEO Voice · {fmt(latestDigest?.observed_at)}</div>
              <h3 className="text-base font-semibold mt-1">{digest.headline || 'Digest'}</h3>
            </div>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
              digest.overall_severity === 'critical' ? 'bg-rose-500/15 text-rose-300' :
              digest.overall_severity === 'warning' ? 'bg-amber-500/15 text-amber-300' :
              'bg-slate-700/30 text-slate-400'
            }`}>{digest.overall_severity || 'info'}</span>
          </div>
          {digest.summary && <p className="text-xs text-slate-300 italic">{digest.summary}</p>}

          {Array.isArray(digest.key_observations) && digest.key_observations.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Key observations</div>
              <ul className="text-[11px] text-slate-300 space-y-0.5 ml-3">
                {digest.key_observations.map((o: string, i: number) => <li key={i} className="list-disc">{o}</li>)}
              </ul>
            </div>
          )}

          {Array.isArray(digest.recommended_actions) && digest.recommended_actions.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Recommended actions</div>
              <div className="space-y-1.5">
                {digest.recommended_actions.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.urgency === 'critical' ? 'bg-rose-500' : a.urgency === 'warning' ? 'bg-amber-500' : 'bg-accent-500'}`} />
                    <div>
                      <span className="text-slate-200 font-medium">{a.action}</span>
                      {a.target && <span className="text-slate-500"> · #{a.target}</span>}
                      {a.why && <span className="text-slate-500"> — {a.why}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open observations */}
      {observations.length > 0 && (
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Open observations ({observations.length})</h3>
            <span className="text-[10px] text-slate-500">{observations.filter(o => o.severity === 'critical').length} critical · {observations.filter(o => o.severity === 'warning').length} warning</span>
          </div>
          <div className="space-y-1.5">
            {observations.slice(0, 20).map(o => (
              <div key={o.id} className={`flex items-start gap-3 px-3 py-2 rounded border ${
                o.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' :
                o.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                'border-bg-border bg-bg-soft'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  o.severity === 'critical' ? 'bg-rose-500' : o.severity === 'warning' ? 'bg-amber-500' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-slate-200">{o.summary}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    {o.agent_id && <span className="font-mono mr-2">#{o.agent_id}</span>}
                    <span className="uppercase tracking-wider mr-2">{o.observation_kind}</span>
                    <span>{fmt(o.observed_at)}</span>
                  </div>
                </div>
                <button onClick={() => doResolve(o.id)} disabled={pending} className="text-[10px] px-2 py-0.5 rounded bg-bg-card border border-bg-border hover:border-accent-500/30 hover:text-accent-300 shrink-0">
                  ✓ resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent grid by fleet */}
      {Object.entries(byFleet).map(([fleet, agents]) => (
        <div key={fleet} className="bg-bg-card border border-bg-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-3">{fleet} <span className="text-[11px] text-slate-500">({agents.length} agents)</span></h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {agents.map((a: any) => {
              const m = STATUS_META[a.status] || STATUS_META.UNKNOWN;
              return (
                <div key={a.agent_id} className={`border rounded p-3 ${m.bg} ${m.border}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-slate-500">#{a.agent_id}</div>
                      <div className="text-xs font-medium truncate">{a.agent_name}</div>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${m.dot} ${a.status !== 'HEALTHY' && a.status !== 'NO_ACTIVITY' ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider font-medium ${m.color}`}>{m.label}</div>
                  {a.issue_summary && <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{a.issue_summary}</div>}
                  <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between">
                    {a.primary_metric_label && (
                      <span>{a.primary_metric_value ?? '—'} {a.primary_metric_label}</span>
                    )}
                    <span>{timeAgo(a.last_execution_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {state.length === 0 && (
        <div className="bg-bg-card border border-bg-border border-dashed rounded-lg p-12 text-center">
          <div className="text-sm text-slate-400">No agent state recorded yet.</div>
          <div className="text-[11px] text-slate-500 mt-1">Click 👁 Scan now to bootstrap.</div>
        </div>
      )}
    </div>
  );
}
