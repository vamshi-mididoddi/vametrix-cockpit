import { TopBar } from '@/components/topbar';
import { AGENTS, STATUS_META, Agent } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import * as Icons from 'lucide-react';
import Link from 'next/link';

// Server component — fetches data with the service-role key at request time.
// Once auth + RLS are in (next session), we switch to per-request user-scoped queries.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function Icon({ name, className }: { name: string; className?: string }) {
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

function fmtINR(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

async function loadOverview() {
  try {
    const supa = supabaseAdmin();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBeforeYest = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: leads },
      { data: conv },
      { data: decs },
      { data: ads },
      { data: adsCompare },
      { data: recentActivity },
    ] = await Promise.all([
      supa.from('leads_log').select('stage, created_at, score, phone'),
      supa.from('conversations').select('id, created_at, direction').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supa.from('perf_decisions').select('*').eq('approval_status', 'pending').order('decided_at', { ascending: false }).limit(5),
      supa.from('ad_campaigns_log').select('spend_inr, leads, campaign_name').eq('snapshot_date', yest),
      supa.from('ad_campaigns_log').select('spend_inr, leads').eq('snapshot_date', dayBeforeYest),
      supa.from('conversations').select('phone, direction, message, created_at, meta').order('created_at', { ascending: false }).limit(8),
    ]);

    const stageCounts: Record<string, number> = { new: 0, engaged: 0, qualified: 0, hot: 0, escalate: 0, lost: 0 };
    let leadsToday = 0;
    let leadsYesterday = 0;
    const yestStartIso = new Date(today.getTime() - 86400000).toISOString();
    const todayStartIso = today.toISOString();

    // Dedup leads by phone — keep latest (works around the multi-row bug)
    const byPhone = new Map<string, any>();
    for (const l of leads || []) {
      const p = l.phone || '__noPhone';
      const existing = byPhone.get(p);
      if (!existing || (l.created_at || '') > (existing.created_at || '')) byPhone.set(p, l);
    }
    const uniqueLeads = Array.from(byPhone.values());
    for (const l of uniqueLeads) {
      if (stageCounts[l.stage] !== undefined) stageCounts[l.stage]++;
      if (l.created_at >= todayStartIso) leadsToday++;
      else if (l.created_at >= yestStartIso) leadsYesterday++;
    }
    const spendYest = (ads || []).reduce((a, r) => a + (Number(r.spend_inr) || 0), 0);
    const leadsYest = (ads || []).reduce((a, r) => a + (Number(r.leads) || 0), 0);
    const spendPrev = (adsCompare || []).reduce((a, r) => a + (Number(r.spend_inr) || 0), 0);
    const leadsPrev = (adsCompare || []).reduce((a, r) => a + (Number(r.leads) || 0), 0);
    const cplYest = leadsYest > 0 ? spendYest / leadsYest : null;
    const cplPrev = leadsPrev > 0 ? spendPrev / leadsPrev : null;
    const inbound24h = (conv || []).filter(c => c.direction === 'inbound').length;
    const outbound24h = (conv || []).filter(c => c.direction === 'outbound').length;

    return {
      total: uniqueLeads.length,
      leadsToday,
      leadsYesterday,
      leadsTodayDelta: leadsYesterday > 0 ? Math.round(((leadsToday - leadsYesterday) / leadsYesterday) * 100) : null,
      stageCounts,
      conv24h: (conv || []).length,
      inbound24h,
      outbound24h,
      decs: decs || [],
      spendYest,
      leadsYest,
      cplYest,
      cplPrev,
      cplDelta: cplPrev && cplYest ? Math.round(((cplYest - cplPrev) / cplPrev) * 100) : null,
      activeCamps: (ads || []).length,
      recentActivity: recentActivity || [],
    };
  } catch (e) {
    return null;
  }
}

export default async function Page() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const data = await loadOverview();

  const liveAgents = AGENTS.filter(a => a.status === 'live').length;
  const parkedAgents = AGENTS.filter(a => a.status === 'parked').length;
  const plannedAgents = AGENTS.filter(a => a.status === 'planned').length;
  const visibleAgents = isAdmin ? AGENTS : AGENTS.filter(a => a.status === 'live');

  return (
    <>
      <TopBar title="Engine Overview" breadcrumb="Overview" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6 animate-fade-in">
        {!data ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200 mb-6">
            <strong>Supabase not configured.</strong> Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel env or <code className="font-mono">.env.local</code>.
          </div>
        ) : (
          <>
            {/* HERO KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KpiCard
                label="Total leads"
                value={String(data.total)}
                hint={`+${data.leadsToday} today`}
                icon="users"
                delta={data.leadsTodayDelta}
                deltaLabel="vs yesterday"
              />
              <KpiCard
                label="Hot + Qualified"
                value={String(data.stageCounts.hot + data.stageCounts.qualified)}
                hint={`${data.stageCounts.hot} hot · ${data.stageCounts.qualified} qualified`}
                icon="flame"
                accent
              />
              <KpiCard
                label="Pending escalation"
                value={String(data.stageCounts.escalate)}
                hint={data.stageCounts.escalate > 0 ? 'requires human now' : 'all clear'}
                icon="triangle-alert"
                warn={data.stageCounts.escalate > 0}
                muted={data.stageCounts.escalate === 0}
              />
              {isAdmin ? (
                <KpiCard
                  label="Ad spend yesterday"
                  value={fmtINR(data.spendYest)}
                  hint={`${data.leadsYest} leads · CPL ${data.cplYest ? fmtINR(data.cplYest) : '—'}`}
                  icon="trending-up"
                  delta={data.cplDelta != null ? -data.cplDelta : null /* lower CPL = positive */}
                  deltaLabel="CPL vs prior"
                  deltaInverse
                />
              ) : (
                <KpiCard
                  label="Conversations 24h"
                  value={String(data.conv24h)}
                  hint={`${data.inbound24h} in · ${data.outbound24h} out`}
                  icon="message-square"
                />
              )}
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* AGENT FLEET */}
                <section>
                  <SectionHeader
                    title={isAdmin ? 'Agent fleet' : 'Live agents'}
                    subtitle={
                      isAdmin
                        ? `${liveAgents} live · ${parkedAgents} parked · ${plannedAgents} planned`
                        : `${liveAgents} agents actively running for you`
                    }
                    right={isAdmin ? <span className="text-[10px] text-slate-500 font-mono">{AGENTS.length} agents total</span> : null}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleAgents.map(a => <AgentCard key={a.id} agent={a} />)}
                  </div>
                </section>

                {/* LIFECYCLE FUNNEL */}
                <section>
                  <SectionHeader title="Lifecycle funnel" subtitle="Live distribution across stages" />
                  <FunnelBar counts={data.stageCounts} />
                </section>
              </div>

              <div className="space-y-6">
                {/* PENDING DECISIONS */}
                <section>
                  <SectionHeader title="Pending decisions" subtitle="Requires your approval" />
                  {data.decs.length === 0 ? (
                    <EmptyState icon="check-circle-2" text="No pending recommendations" />
                  ) : (
                    <>
                      <div className="space-y-2">
                        {data.decs.map((d: any) => (
                          <div key={d.id} className="bg-bg-card border border-bg-border rounded-lg p-3 hover:border-bg-borderhover hover:bg-bg-cardhover transition group">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="text-xs font-medium truncate text-slate-200">{d.campaign_name}</div>
                              <span className="text-[10px] text-amber-300 font-mono shrink-0">{d.action || 'review'}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{(d.reason || '').slice(0, 140)}</div>
                          </div>
                        ))}
                      </div>
                      <Link href="/agent-8" className="block mt-2 text-[11px] text-accent-400 hover:text-accent-300 transition">
                        View all in Performance Marketer →
                      </Link>
                    </>
                  )}
                </section>

                {/* TODAY'S ACTIVITY */}
                <section>
                  <SectionHeader title="Today's activity" subtitle="Last 24 hours" />
                  <div className="bg-bg-card border border-bg-border rounded-lg p-4 space-y-2.5 text-xs">
                    <Row label="New leads" value={String(data.leadsToday)} />
                    <Row label="Inbound messages" value={String(data.inbound24h)} />
                    <Row label="AI outbound" value={String(data.outbound24h)} />
                    <Row label="Active campaigns" value={String(data.activeCamps)} />
                    <div className="h-px bg-bg-border my-1" />
                    <Row label="Engine health" value="Nominal" valueClass="text-accent-400" pulse />
                  </div>
                </section>

                {/* RECENT ACTIVITY FEED */}
                <section>
                  <SectionHeader title="Live activity feed" subtitle="Latest messages flowing through" />
                  {data.recentActivity.length === 0 ? (
                    <EmptyState icon="inbox" text="No recent activity" />
                  ) : (
                    <div className="space-y-1.5">
                      {data.recentActivity.slice(0, 6).map((c: any, i: number) => (
                        <ActivityRow key={i} c={c} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({
  label, value, hint, accent, warn, muted, icon, delta, deltaLabel, deltaInverse,
}: {
  label: string; value: string; hint?: string;
  accent?: boolean; warn?: boolean; muted?: boolean;
  icon?: string;
  delta?: number | null; deltaLabel?: string; deltaInverse?: boolean;
}) {
  const valueColor = accent ? 'text-accent-400' : warn ? 'text-amber-400' : muted ? 'text-slate-400' : 'text-slate-100';
  const iconBg = accent ? 'bg-accent-500/10 text-accent-400' : warn ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/30 text-slate-400';
  const deltaPositive = delta != null && delta > 0;
  const deltaNegative = delta != null && delta < 0;
  const showDeltaPositive = deltaInverse ? deltaNegative : deltaPositive;
  const showDeltaNegative = deltaInverse ? deltaPositive : deltaNegative;
  const deltaColor = showDeltaPositive ? 'text-accent-400' : showDeltaNegative ? 'text-rose-400' : 'text-slate-500';
  const deltaArrow = delta == null ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '';

  return (
    <div className="grad-card border border-bg-border rounded-lg p-4 hover:border-bg-borderhover transition group">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
        {icon && (
          <div className={`w-6 h-6 rounded ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon name={icon} className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {hint && <div className="text-[11px] text-slate-500 truncate">{hint}</div>}
        {delta != null && Math.abs(delta) > 0 && (
          <div className={`text-[10px] font-mono font-semibold tabular-nums ${deltaColor} flex items-center shrink-0`}>
            {deltaArrow}{Math.abs(delta)}%{deltaLabel && <span className="ml-1 text-slate-600 font-normal">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-200">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-bg-card/40 border border-dashed border-bg-border rounded-lg p-4 flex items-center gap-2 text-xs text-slate-500 italic">
      <Icon name={icon} className="w-3.5 h-3.5 shrink-0" />
      {text}
    </div>
  );
}

function Row({ label, value, valueClass, pulse }: { label: string; value: string; valueClass?: string; pulse?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums flex items-center gap-1.5 ${valueClass || ''}`}>
        {pulse && <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />}
        {value}
      </span>
    </div>
  );
}

function ActivityRow({ c }: { c: any }) {
  const isIn = c.direction === 'inbound';
  const ts = c.created_at ? new Date(c.created_at) : null;
  const minutesAgo = ts ? Math.floor((Date.now() - ts.getTime()) / 60000) : null;
  const ago = minutesAgo == null ? '—' : minutesAgo < 1 ? 'now' : minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo / 60)}h`;
  const lang = c.meta?.language || c.meta?.language_detected || null;
  const stage = c.meta?.stage || null;
  return (
    <div className="bg-bg-card/60 border border-bg-border rounded-md px-2.5 py-2 hover:bg-bg-cardhover transition group">
      <div className="flex items-center gap-2 text-[10px] mb-0.5">
        <span className={`inline-flex items-center gap-1 font-medium ${isIn ? 'text-sky-400' : 'text-accent-400'}`}>
          <span className="w-1 h-1 rounded-full bg-current" />
          {isIn ? 'IN' : 'OUT'}
        </span>
        <span className="text-slate-600 font-mono truncate">{(c.phone || '').slice(-10)}</span>
        {lang && <span className="text-slate-600 font-mono uppercase">{lang}</span>}
        {stage && <span className="text-slate-600 font-mono uppercase">{stage}</span>}
        <span className="ml-auto text-slate-600 font-mono shrink-0">{ago}</span>
      </div>
      <div className="text-[11px] text-slate-400 line-clamp-1 leading-snug">{c.message || '(no body)'}</div>
    </div>
  );
}

function FunnelBar({ counts }: { counts: Record<string, number> }) {
  const order = ['new', 'engaged', 'qualified', 'hot', 'escalate', 'lost'];
  const total = order.reduce((a, k) => a + (counts[k] || 0), 0);
  if (total === 0) return <EmptyState icon="kanban-square" text="No leads in the funnel yet" />;
  const palette: Record<string, { bg: string; text: string }> = {
    new:       { bg: 'bg-slate-600',   text: 'text-slate-300' },
    engaged:   { bg: 'bg-sky-500',     text: 'text-sky-300' },
    qualified: { bg: 'bg-violet-500',  text: 'text-violet-300' },
    hot:       { bg: 'bg-accent-500',  text: 'text-accent-300' },
    escalate:  { bg: 'bg-amber-500',   text: 'text-amber-300' },
    lost:      { bg: 'bg-rose-500',    text: 'text-rose-300' },
  };
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-4">
      <div className="flex h-2 rounded-full overflow-hidden bg-bg-soft mb-3">
        {order.map(k => {
          const c = counts[k] || 0;
          if (c === 0) return null;
          const pct = (c / total) * 100;
          return <div key={k} className={`${palette[k].bg} h-full transition-all`} style={{ width: `${pct}%` }} title={`${k}: ${c}`} />;
        })}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-[11px]">
        {order.map(k => {
          const c = counts[k] || 0;
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <div key={k}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${palette[k].bg}`} />
                <span className="text-slate-500 uppercase font-mono tracking-wider">{k}</span>
              </div>
              <div className={`text-base font-semibold tabular-nums ${palette[k].text}`}>{c}</div>
              <div className="text-[10px] text-slate-600 tabular-nums">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentCard({ agent: a }: { agent: Agent }) {
  const m = STATUS_META[a.status];
  return (
    <Link href={`/${a.id}`} className="text-left bg-bg-card hover:bg-bg-cardhover border border-bg-border hover:border-bg-borderhover rounded-lg p-3.5 transition-all group block hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-md ${m.bg} ${m.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
            <Icon name={a.icon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
              #{String(a.num).padStart(2, '0')}
              <span className="text-slate-700">·</span>
              <span className="truncate">{a.fleet.split(' ')[0]}</span>
            </div>
            <div className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition">{a.name}</div>
          </div>
        </div>
        <span className={`stage-badge ${m.bg} ${m.color} ${m.border} border shrink-0`}>
          {a.status === 'live' && <span className={`w-1 h-1 rounded-full ${m.dot} animate-pulse`} />}
          {a.status !== 'live' && <span className={`w-1 h-1 rounded-full ${m.dot}`} />}
          {m.label}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{a.desc}</p>
    </Link>
  );
}
