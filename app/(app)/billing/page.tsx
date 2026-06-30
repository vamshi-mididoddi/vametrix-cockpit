import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenant } from '@/lib/tenant';
import {
  AGENCY_BASELINE, computeInvoice, planFromTenant,
  type BillingUsage, type PricingPlan,
} from '@/lib/billing';
import { PlanSwitcher } from './plan-switcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtINR(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}
function fmtINRshort(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  const v = Math.round(Number(n));
  if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(2) + 'Cr';
  if (Math.abs(v) >= 100000) return '₹' + (v / 100000).toFixed(2) + 'L';
  return '₹' + v.toLocaleString('en-IN');
}

async function loadUsage(tenantId: string): Promise<{ usage: BillingUsage; periodLabel: string } | null> {
  try {
    const supa = supabaseAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartIso = monthStart.toISOString();
    const monthStartDate = monthStartIso.slice(0, 10);
    const periodLabel = monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const [{ data: createdRaw }, { data: wonRaw }, { data: ads }] = await Promise.all([
      supa.from('leads_log')
        .select('phone,stage,status,created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStartIso)
        .limit(8000),
      supa.from('leads_log')
        .select('phone,deal_value_inr,won_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'won')
        .gte('won_at', monthStartIso)
        .limit(8000),
      supa.from('ad_campaigns_log')
        .select('spend_inr,snapshot_date')
        .gte('snapshot_date', monthStartDate),
    ]);

    // Dedupe by phone — leads_log can have multiple rows per phone; we bill on
    // these numbers, so one row per phone (latest) is essential.
    const dedupeByPhone = (rows: any[], tsField: string) => {
      const m = new Map<string, any>();
      for (const r of rows || []) {
        const key = r.phone || `__row_${m.size}`;
        const prev = m.get(key);
        if (!prev || String(r[tsField] || '') > String(prev[tsField] || '')) m.set(key, r);
      }
      return Array.from(m.values());
    };
    const created = dedupeByPhone(createdRaw || [], 'created_at');
    const won = dedupeByPhone(wonRaw || [], 'won_at');

    let qualifiedLeads = 0;
    for (const l of created as any[]) {
      if (['qualified', 'hot'].includes(l.stage) || l.status === 'won') qualifiedLeads++;
    }
    const wonDeals = won.length;
    const revenueInr = won.reduce((a, r) => a + (Number((r as any).deal_value_inr) || 0), 0);
    const adSpendInr = (ads || []).reduce((a, r) => a + (Number((r as any).spend_inr) || 0), 0);

    return { usage: { qualifiedLeads, wonDeals, revenueInr, adSpendInr }, periodLabel };
  } catch {
    return null;
  }
}

export default async function Page() {
  const user = await requireAdmin();
  const [loaded, tenant] = await Promise.all([loadUsage(user.tenant_id), getCurrentTenant()]);
  const plan = planFromTenant(tenant?.plan);

  return (
    <>
      <TopBar title="Billing" breadcrumb={user.tenant_name || 'Vametrix'} />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        {!loaded ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
            <strong>Couldn’t load billing data.</strong> Check the Supabase connection.
          </div>
        ) : (
          <Billing usage={loaded.usage} periodLabel={loaded.periodLabel} plan={plan} />
        )}
      </div>
    </>
  );
}

function Billing({ usage, periodLabel, plan }: { usage: BillingUsage; periodLabel: string; plan: PricingPlan }) {
  const inv = computeInvoice(usage, plan, AGENCY_BASELINE);

  return (
    <div className="max-w-[1100px] space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Outcome-based billing · {periodLabel}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          You pay for results, not software. A small platform fee, a fee per qualified lead delivered,
          and a success fee on the revenue actually closed.
        </p>
      </div>

      {/* Usage this period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Qualified leads" value={usage.qualifiedLeads.toLocaleString('en-IN')} />
        <Stat label="Deals won" value={usage.wonDeals.toLocaleString('en-IN')} />
        <Stat label="Revenue produced" value={fmtINRshort(usage.revenueInr)} accent />
        <Stat label="Ad spend managed" value={fmtINRshort(usage.adSpendInr)} />
      </div>

      {/* Plan selector — changing this re-prices the invoice below in real time */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Plan</h3>
          <span className="text-[11px] text-slate-500">Pick a plan — the invoice updates instantly.</span>
        </div>
        <PlanSwitcher current={plan.tier} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoice */}
        <div className="lg:col-span-2">
          <section className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Invoice preview</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Auto-calculated from this month’s outcomes.</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">Draft</span>
            </div>
            <div className="divide-y divide-bg-border">
              {inv.lines.map((l) => (
                <div key={l.label} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-200">{l.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{l.detail}</div>
                  </div>
                  <div className="text-[14px] font-semibold tabular-nums text-slate-100 shrink-0">{fmtINR(l.amountInr)}</div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-bg-border bg-bg-soft/40 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-slate-300">Total due · {periodLabel}</div>
              <div className="text-2xl font-semibold tabular-nums text-accent-400">{fmtINR(inv.totalInr)}</div>
            </div>
          </section>

          <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
            Qualified lead = a lead the engine moved to <strong>qualified</strong> or <strong>hot</strong> (or that closed) this month.
            Success fee applies to revenue marked <strong>won</strong> in the cockpit. Each plan’s rates live in <code className="text-slate-400">lib/billing.ts</code>; a client’s plan is stored on their tenant record and can be switched above.
          </p>
        </div>

        {/* Value vs agency */}
        <div className="space-y-5">
          <section className="bg-accent-500/5 border border-accent-500/20 rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-wider text-accent-300 mb-3">vs a traditional agency</div>
            <Row label="Agency would charge" value={fmtINR(inv.agencyCostInr)} sub={`₹${AGENCY_BASELINE.retainerInr.toLocaleString('en-IN')} retainer + ${AGENCY_BASELINE.pctOfAdSpend}% of ad spend`} />
            <Row label="Vametrix charges" value={fmtINR(inv.totalInr)} sub="outcome-based" accent />
            <div className="mt-3 pt-3 border-t border-accent-500/20">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">You save this month</div>
              <div className={`text-2xl font-semibold tabular-nums mt-0.5 ${inv.savingsInr >= 0 ? 'text-accent-400' : 'text-rose-400'}`}>
                {fmtINR(inv.savingsInr)}
              </div>
            </div>
          </section>

          <section className="bg-bg-card border border-bg-border rounded-lg p-5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Effective take rate</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-100">
              {inv.effectiveTakeRatePct != null ? inv.effectiveTakeRatePct.toFixed(1) + '%' : '—'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Vametrix’s total cost as a share of the revenue it produced. The lower this is, the more obvious the ROI — and the harder we are to cancel.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`bg-bg-card border rounded-lg p-4 ${accent ? 'border-accent-500/30' : 'border-bg-border'}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${accent ? 'text-accent-400' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-[12px] text-slate-300">{label}</div>
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
      <div className={`text-[14px] font-semibold tabular-nums shrink-0 ${accent ? 'text-accent-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}
