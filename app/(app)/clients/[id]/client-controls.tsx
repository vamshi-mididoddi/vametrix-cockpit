'use client';

import { useState, useTransition } from 'react';
import { PLANS, PLAN_TIERS, type PlanTier } from '@/lib/billing';
import { updateClient } from '../actions';

const STATUSES = ['active', 'trial', 'paused', 'churned'];

export function ClientControls({ tenantId, plan, status }: { tenantId: string; plan: PlanTier; status: string }) {
  const [pending, startTransition] = useTransition();
  const [p, setP] = useState<PlanTier>(plan);
  const [s, setS] = useState(status);
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    if (pending) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updateClient(tenantId, { plan: p, status: s });
      setMsg(res.ok ? 'Saved.' : (res.error || 'Failed'));
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Plan</span>
        <select value={p} onChange={e => setP(e.target.value as PlanTier)} className={sel}>
          {PLAN_TIERS.map(t => <option key={t} value={t}>{PLANS[t].label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Status</span>
        <select value={s} onChange={e => setS(e.target.value)} className={sel}>
          {STATUSES.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <button onClick={save} disabled={pending} className="px-3 py-2 text-xs font-semibold rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 transition disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
      {msg && <span className="text-[11px] text-slate-400">{msg}</span>}
    </div>
  );
}

const sel = 'mt-1 block bg-bg-soft border border-bg-border rounded-md px-3 py-2 text-[13px] text-slate-200 focus:outline-none focus:border-accent-500/50';
