'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDecisionStatus } from './actions';

function fmtINR(n: any) {
  if (n == null || isNaN(n as any)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

const ACTION_COLOR: Record<string, string> = {
  kill: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  pause: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  scale_up: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
  scale_down: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  investigate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  review_objective: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-bg-soft text-slate-300 border-bg-border',
  approved: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  auto_executed: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
};

export function AgentEightClient({ initialDecs, ads }: { initialDecs: any[]; ads: any[] }) {
  const [decs, setDecs] = useState(initialDecs);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const visible = decs.filter(d => filterStatus === 'all' || d.approval_status === filterStatus);

  // Aggregate ad metrics
  const byCamp: Record<string, any> = {};
  for (const a of ads) {
    if (!byCamp[a.campaign_id]) byCamp[a.campaign_id] = { ...a, spend: 0, leads: 0, impressions: 0, clicks: 0 };
    byCamp[a.campaign_id].spend += Number(a.spend_inr) || 0;
    byCamp[a.campaign_id].leads += Number(a.leads) || 0;
    byCamp[a.campaign_id].impressions += Number(a.impressions) || 0;
    byCamp[a.campaign_id].clicks += Number(a.clicks) || 0;
  }
  const campaigns = Object.values(byCamp).sort((a: any, b: any) => b.spend - a.spend);
  const totalSpend = campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const totalLeads = campaigns.reduce((s: number, c: any) => s + c.leads, 0);
  const pendingCount = decs.filter(d => d.approval_status === 'pending').length;

  async function handleDecision(id: number, newStatus: 'approved' | 'rejected') {
    startTransition(async () => {
      const res = await updateDecisionStatus(id, newStatus);
      if (res.ok) {
        setDecs(prev => prev.map(d => d.id === id ? { ...d, approval_status: newStatus, approved_at: new Date().toISOString(), approved_by: 'cockpit_user' } : d));
        router.refresh();
      } else {
        alert('Failed: ' + (res.error || 'unknown'));
      }
    });
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Spend (7d)" value={fmtINR(totalSpend)} />
        <KpiCard label="Raw leads (7d)" value={String(totalLeads)} />
        <KpiCard label="Blended CPL" value={totalLeads > 0 ? fmtINR(totalSpend / totalLeads) : '—'} />
        <KpiCard label="Pending decisions" value={String(pendingCount)} warn={pendingCount > 0} />
      </div>

      {/* Decision queue */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Decision queue</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{decs.length} total · {pendingCount} pending</p>
          </div>
          <div className="flex gap-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 text-[11px] rounded-md border ${filterStatus === s ? 'bg-accent-500/10 text-accent-400 border-accent-500/30' : 'bg-bg-card text-slate-400 border-bg-border hover:border-bg-borderhover'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="bg-bg-card border border-bg-border rounded-lg p-6 text-center text-sm text-slate-500 italic">
            No decisions in this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map(d => {
              const aCls = ACTION_COLOR[d.action] || 'bg-slate-700 text-slate-300';
              const sCls = STATUS_COLOR[d.approval_status] || STATUS_COLOR.pending;
              return (
                <div key={d.id} className="bg-bg-card border border-bg-border rounded-lg p-4 hover:border-bg-borderhover transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`stage-badge border ${aCls}`}>{d.action}</span>
                      <div className="text-sm font-medium truncate">{d.campaign_name || '—'}</div>
                    </div>
                    <span className={`stage-badge border ${sCls}`}>{d.approval_status}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{d.reason}</p>
                  {d.current_state && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">View campaign state</summary>
                      <pre className="mt-2 text-[10px] bg-bg-soft border border-bg-border rounded p-2 overflow-x-auto text-slate-300">{JSON.stringify(d.current_state, null, 2)}</pre>
                    </details>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500">{timeAgo(d.decided_at)} ago · #{d.id}</div>
                    {d.approval_status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDecision(d.id, 'approved')}
                          disabled={pending}
                          className="px-2.5 py-1 text-[11px] rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50"
                        >Approve</button>
                        <button
                          onClick={() => handleDecision(d.id, 'rejected')}
                          disabled={pending}
                          className="px-2.5 py-1 text-[11px] rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
                        >Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Campaign table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Active campaigns — last 7 days</h3>
        <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-soft border-b border-bg-border">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="text-left py-2 px-3">Campaign</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">Spend</th>
                <th className="text-right py-2 px-3">Leads</th>
                <th className="text-right py-2 px-3">CPL</th>
                <th className="text-right py-2 px-3">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500 text-sm">No campaigns.</td></tr>
              ) : campaigns.map((c: any) => {
                const cpl = c.leads > 0 ? c.spend / c.leads : null;
                const ctr = c.impressions > 0 ? (c.clicks / c.impressions * 100) : 0;
                const cplCol = cpl == null ? 'text-slate-600' : cpl < 70 ? 'text-accent-400' : cpl < 150 ? 'text-amber-400' : 'text-rose-400';
                const sCol = c.effective_status === 'ACTIVE' ? 'text-accent-400' : 'text-slate-500';
                return (
                  <tr key={c.campaign_id} className="border-b border-bg-border hover:bg-bg-cardhover">
                    <td className="py-2 px-3 text-xs">
                      <div className="font-medium truncate max-w-[280px]">{c.campaign_name}</div>
                      <div className="text-[10px] text-slate-500">{c.objective}</div>
                    </td>
                    <td className={`py-2 px-3 text-[11px] ${sCol}`}>{c.effective_status}</td>
                    <td className="py-2 px-3 text-xs text-right tabular-nums">{fmtINR(c.spend)}</td>
                    <td className="py-2 px-3 text-xs text-right tabular-nums">{c.leads}</td>
                    <td className={`py-2 px-3 text-xs text-right tabular-nums ${cplCol}`}>{cpl !== null ? fmtINR(cpl) : '—'}</td>
                    <td className="py-2 px-3 text-xs text-right tabular-nums">{ctr.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="grad-card border border-bg-border rounded-lg p-3">
      <div className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${warn ? 'text-amber-400' : ''}`}>{value}</div>
    </div>
  );
}
