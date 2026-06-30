import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { BRAND_LABEL } from '@/lib/agents';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WINDOWS = [7, 30, 90] as const;
type WindowDays = (typeof WINDOWS)[number];

function fmtINR(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  const v = Math.round(Number(n));
  if (Math.abs(v) >= 10000000) return '₹' + (v / 10000000).toFixed(2) + 'Cr';
  if (Math.abs(v) >= 100000) return '₹' + (v / 100000).toFixed(2) + 'L';
  return '₹' + v.toLocaleString('en-IN');
}
function fmtINRfull(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}
function fmtNum(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return Math.round(Number(n)).toLocaleString('en-IN');
}
function fmtX(n: number | null | undefined) {
  if (n == null || isNaN(n as any) || !isFinite(n as any)) return '—';
  return (Math.round(Number(n) * 10) / 10).toFixed(1) + '×';
}
function pct(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return Math.round(Number(n)) + '%';
}
function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface BrandRow { brand: string; leads: number; qualified: number; won: number; revenue: number; }
interface DayPoint { date: string; spend: number; revenue: number; }

async function loadRevenue(tenantId: string, days: WindowDays) {
  try {
    const supa = supabaseAdmin();
    const cutoffMs = Date.now() - days * 86400000;
    const cutoffIso = new Date(cutoffMs).toISOString();
    const cutoffDate = cutoffIso.slice(0, 10);

    // Bounded, indexed queries (created_at / won_at indexes exist) — only the rows
    // relevant to the window are fetched, instead of pulling the whole leads table.
    const [{ data: createdRaw }, { data: wonRaw }, { data: ads }] = await Promise.all([
      supa.from('leads_log')
        .select('phone,brand,stage,status,created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', cutoffIso)
        .limit(8000),
      supa.from('leads_log')
        .select('phone,brand,deal_value_inr,won_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'won')
        .gte('won_at', cutoffIso)
        .limit(8000),
      supa.from('ad_campaigns_log')
        .select('spend_inr,leads,snapshot_date')
        .gte('snapshot_date', cutoffDate),
    ]);

    // Dedupe by phone — leads_log historically has multiple rows per phone
    // (qualifier inserted instead of upserting), which would overcount leads
    // and, worse, double-count revenue. Keep one row per phone (latest).
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

    // Ad spend (account-level; ad_campaigns_log is not split by brand)
    const spend = (ads || []).reduce((a, r) => a + (Number((r as any).spend_inr) || 0), 0);
    const adLeads = (ads || []).reduce((a, r) => a + (Number((r as any).leads) || 0), 0);

    // Daily spend map
    const spendByDate: Record<string, number> = {};
    for (const r of (ads || []) as any[]) {
      const k = String(r.snapshot_date).slice(0, 10);
      spendByDate[k] = (spendByDate[k] || 0) + (Number(r.spend_inr) || 0);
    }

    // Funnel + revenue, overall + per brand, + daily revenue map
    const brands = new Map<string, BrandRow>();
    const bump = (key: string): BrandRow => {
      const k = key || 'unknown';
      let b = brands.get(k);
      if (!b) { b = { brand: k, leads: 0, qualified: 0, won: 0, revenue: 0 }; brands.set(k, b); }
      return b;
    };
    const revByDate: Record<string, number> = {};

    let totLeads = 0, totQualified = 0, totWon = 0, totLost = 0, totRevenue = 0;

    // Leads created in the window → top-of-funnel + qualification
    for (const l of (created || []) as any[]) {
      const isQualifiedPlus = ['qualified', 'hot'].includes(l.stage) || l.status === 'won';
      const b = bump(l.brand);
      totLeads++; b.leads++;
      if (isQualifiedPlus) { totQualified++; b.qualified++; }
      if (l.status === 'lost') totLost++;
    }

    // Deals won in the window → revenue (won_at may pre-date the lead's creation window)
    for (const l of (won || []) as any[]) {
      const b = bump(l.brand);
      totWon++; b.won++;
      const v = Number(l.deal_value_inr) || 0;
      totRevenue += v; b.revenue += v;
      const k = String(l.won_at).slice(0, 10);
      revByDate[k] = (revByDate[k] || 0) + v;
    }

    // Daily series across the window
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const series: DayPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const k = dateKey(d);
      series.push({ date: k, spend: spendByDate[k] || 0, revenue: revByDate[k] || 0 });
    }

    const brandRows = Array.from(brands.values())
      .filter(b => b.leads > 0 || b.won > 0)
      .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

    return {
      spend, adLeads, totLeads, totQualified, totWon, totLost, totRevenue,
      roas: spend > 0 ? totRevenue / spend : null,
      profit: totRevenue - spend,
      cpl: adLeads > 0 ? spend / adLeads : (totLeads > 0 ? spend / totLeads : null),
      cac: totWon > 0 ? spend / totWon : null,
      avgDeal: totWon > 0 ? totRevenue / totWon : null,
      qualRate: totLeads > 0 ? (totQualified / totLeads) * 100 : null,
      closeRate: totQualified > 0 ? (totWon / totQualified) * 100 : null,
      winRate: (totWon + totLost) > 0 ? (totWon / (totWon + totLost)) * 100 : null,
      brandRows, series,
    };
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }: { searchParams?: { window?: string } }) {
  const user = await requireAdmin();
  const reqWin = Number(searchParams?.window);
  const days: WindowDays = (WINDOWS as readonly number[]).includes(reqWin) ? (reqWin as WindowDays) : 30;
  const data = await loadRevenue(user.tenant_id, days);

  return (
    <>
      <TopBar title="Revenue OS" breadcrumb={user.tenant_name || 'Vametrix'} />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        {!data ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
            <strong>Couldn’t load revenue data.</strong> Check the Supabase connection.
          </div>
        ) : (
          <div className="max-w-[1500px] space-y-5">
            {/* Headline + window toggle */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">The revenue loop · last {days} days</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Every rupee of ad spend, traced through to closed revenue. This is the outcome Vametrix is paid to produce.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-bg-card border border-bg-border rounded-md p-0.5">
                {WINDOWS.map(w => (
                  <Link
                    key={w}
                    href={`/revenue?window=${w}`}
                    className={`px-3 py-1 text-xs rounded transition ${
                      w === days ? 'bg-accent-500/15 text-accent-300' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w}d
                  </Link>
                ))}
              </div>
            </div>

            {/* The loop strip with conversion rates between steps */}
            <div className="bg-bg-card border border-bg-border rounded-lg p-5">
              <div className="flex flex-wrap items-stretch gap-2">
                <LoopStep label="Ad spend" value={fmtINR(data.spend)} tone="spend" />
                <Arrow caption={`CPL ${fmtINR(data.cpl)}`} />
                <LoopStep label="Leads" value={fmtNum(data.totLeads)} />
                <Arrow caption={pct(data.qualRate)} />
                <LoopStep label="Qualified" value={fmtNum(data.totQualified)} />
                <Arrow caption={pct(data.closeRate)} />
                <LoopStep label="Won" value={fmtNum(data.totWon)} tone="won" />
                <Arrow caption={`avg ${fmtINR(data.avgDeal)}`} />
                <LoopStep label="Revenue" value={fmtINR(data.totRevenue)} tone="revenue" />
              </div>
            </div>

            {/* Outcome KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="ROAS" value={fmtX(data.roas)} hint="revenue ÷ ad spend" big accent />
              <Kpi label={`Gross profit (${days}d)`} value={fmtINR(data.profit)} hint="revenue − ad spend" warn={data.profit < 0} />
              <Kpi label="CAC" value={fmtINR(data.cac)} hint="ad spend ÷ deals won" />
              <Kpi label="Avg deal" value={fmtINR(data.avgDeal)} hint={`${data.totWon} deals won`} />
            </div>

            {/* Daily trend */}
            <TrendChart series={data.series} />

            {/* Per-brand breakdown */}
            <section className="bg-bg-card border border-bg-border rounded-lg p-5">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Revenue by brand</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Leads → qualified → won → revenue, per brand (last {days} days).</p>
                </div>
              </div>
              {data.brandRows.length === 0 ? (
                <div className="text-[12px] text-slate-500 italic py-6 text-center">No lead activity in the window yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-bg-border">
                        <th className="text-left font-medium py-2 pr-3">Brand</th>
                        <th className="text-right font-medium py-2 px-3">Leads</th>
                        <th className="text-right font-medium py-2 px-3">Qualified</th>
                        <th className="text-right font-medium py-2 px-3">Won</th>
                        <th className="text-right font-medium py-2 px-3">Conv.</th>
                        <th className="text-right font-medium py-2 pl-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.brandRows.map((b) => (
                        <tr key={b.brand} className="border-b border-bg-border/50 hover:bg-bg-soft/50 transition">
                          <td className="py-2.5 pr-3 font-medium text-slate-200">{BRAND_LABEL[b.brand] || b.brand}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-300">{fmtNum(b.leads)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-violet-300">{fmtNum(b.qualified)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-accent-300">{fmtNum(b.won)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">{b.leads > 0 ? pct((b.won / b.leads) * 100) : '—'}</td>
                          <td className="py-2.5 pl-3 text-right tabular-nums font-semibold text-slate-100">{fmtINRfull(b.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
                Note: ad spend is reported at the Meta ad-account level, so ROAS, CAC and gross profit are shown engine-wide.
                Per-brand spend attribution arrives when campaigns are tagged by brand.
              </p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function LoopStep({ label, value, tone }: { label: string; value: string; tone?: 'spend' | 'won' | 'revenue' }) {
  const valColor =
    tone === 'revenue' ? 'text-accent-400' :
    tone === 'won' ? 'text-accent-300' :
    'text-slate-100';
  return (
    <div className="flex-1 min-w-[110px] bg-bg-soft border border-bg-border rounded-md px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 tabular-nums ${valColor}`}>{value}</div>
    </div>
  );
}

function Arrow({ caption }: { caption?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-slate-600 shrink-0 px-0.5 select-none">
      <span className="text-lg leading-none">→</span>
      {caption && <span className="text-[9px] text-slate-500 mt-1 whitespace-nowrap">{caption}</span>}
    </div>
  );
}

function Kpi({ label, value, hint, accent, big, warn }: { label: string; value: string; hint?: string; accent?: boolean; big?: boolean; warn?: boolean }) {
  return (
    <div className={`bg-bg-card border rounded-lg p-4 ${
      warn ? 'border-rose-500/30' : accent ? 'border-accent-500/30 shadow-[0_0_28px_rgba(16,185,129,0.08)]' : 'border-bg-border'
    }`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`${big ? 'text-3xl' : 'text-2xl'} font-semibold mt-1 tabular-nums ${
        warn ? 'text-rose-400' : accent ? 'text-accent-400' : 'text-slate-100'
      }`}>{value}</div>
      {hint && <div className="text-[10px] text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function TrendChart({ series }: { series: DayPoint[] }) {
  const max = Math.max(1, ...series.map(p => Math.max(p.spend, p.revenue)));
  const totalSpend = series.reduce((a, p) => a + p.spend, 0);
  const totalRev = series.reduce((a, p) => a + p.revenue, 0);
  const wide = series.length > 31;
  return (
    <section className="bg-bg-card border border-bg-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Daily spend vs revenue</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Spend goes out, revenue comes back. The gap is your margin.</p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-slate-600" /> Spend</span>
          <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-accent-500" /> Revenue</span>
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-[140px]">
        {series.map((p) => (
          <div key={p.date} className="flex-1 flex items-end justify-center gap-[2px] h-full group relative" title={`${p.date} · spend ${fmtINRfull(p.spend)} · revenue ${fmtINRfull(p.revenue)}`}>
            <div className="w-1/2 bg-slate-600/80 rounded-t-sm transition group-hover:bg-slate-500" style={{ height: `${(p.spend / max) * 100}%` }} />
            <div className="w-1/2 bg-accent-500/80 rounded-t-sm transition group-hover:bg-accent-400" style={{ height: `${(p.revenue / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
        <span>{series[0]?.date}</span>
        {!wide && <span className="text-slate-600">·</span>}
        <span>{series[series.length - 1]?.date}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-bg-border">
        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Total spend</div><div className="text-base font-semibold tabular-nums text-slate-200 mt-0.5">{fmtINRfull(totalSpend)}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-slate-500">Total revenue</div><div className="text-base font-semibold tabular-nums text-accent-400 mt-0.5">{fmtINRfull(totalRev)}</div></div>
      </div>
    </section>
  );
}
