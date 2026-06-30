'use client';

import { useState, useTransition } from 'react';
import { PLANS, PLAN_TIERS, type PlanTier } from '@/lib/billing';
import { setTenantPlan } from './actions';

export function PlanSwitcher({ current }: { current: PlanTier }) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<PlanTier>(current);
  const [busy, setBusy] = useState<PlanTier | null>(null);

  function choose(tier: PlanTier) {
    if (tier === active || pending) return;
    setBusy(tier);
    startTransition(async () => {
      const res = await setTenantPlan(tier);
      if (res.ok) setActive(tier);
      setBusy(null);
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {PLAN_TIERS.map((tier) => {
        const p = PLANS[tier];
        const isActive = tier === active;
        return (
          <button
            key={tier}
            onClick={() => choose(tier)}
            disabled={pending}
            className={`text-left rounded-lg border p-4 transition disabled:opacity-60 ${
              isActive
                ? 'border-accent-500/50 bg-accent-500/10 shadow-[0_0_28px_rgba(16,185,129,0.10)]'
                : 'border-bg-border bg-bg-card hover:border-bg-borderhover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-slate-100">{p.label}</span>
              {isActive ? (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-300 border border-accent-500/30">Current</span>
              ) : busy === tier ? (
                <span className="text-[9px] text-slate-500">saving…</span>
              ) : null}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{p.blurb}</div>
            <div className="mt-3 space-y-0.5 text-[11px] text-slate-400 tabular-nums">
              <div>₹{p.platformFeeInr.toLocaleString('en-IN')}<span className="text-slate-600"> / mo base</span></div>
              <div>₹{p.perQualifiedLeadInr}<span className="text-slate-600"> / qualified lead</span></div>
              <div>{p.successFeePct}%<span className="text-slate-600"> success fee</span></div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
