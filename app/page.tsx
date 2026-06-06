import { TopBar } from '@/components/topbar';
import { AGENTS, STATUS_META, Agent, BRAND_LABEL } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import * as Icons from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function Icon({ name, className }: { name: string; className?: string }) {
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

function fmtINR(n: number | null | undefined) {
  if (n == null || isNaN(n as any)) return '—';
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

// ───────────────────── TEAM HOME (sales rep view) ─────────────────────
async function loadTeamHome(userId: string, tenantId: string) {
  try {
    const supa = supabaseAdmin();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
    const sinceToday = new Date(); sinceToday.setHours(0, 0, 0, 0);
    const [
      { data: leads },
      { data: activity },
      { data: summary },
    ] = await Promise.all([
      supa.from('leads_log').select('phone,name,brand,stage,score,status,priority,deal_value_inr,last_action_at,won_at,lost_at,created_at').eq('tenant_id', tenantId).eq('owner_id', userId).order('created_at', { ascending: false }).limit(100),
      supa.from('lead_activities').select('*').eq('tenant_id', tenantId).eq('actor_user_id', userId).order('created_at', { ascending: false }).limit(15),
      supa.rpc('lead_pipeline_summary', { p_tenant_id: tenantId, p_owner_id: userId }),
    ]);
    const sum = Array.isArray(summary) ? summary[0] : (summary as any);
    return { leads: leads || [], activity: activity || [], summary: sum || null };
  } catch {
    return { leads: [], activity: [], summary: null };
  }
}

function TeamHome({ user, data }: { user: any; data: any }) {
  const hotLeads = data.leads.filter((l: any) => l.stage === 'hot' && l.status === 'open');
  const qualifiedLeads = data.leads.filter((l: any) => l.stage === 'qualified' && l.status === 'open');
  const openLeads = data.leads.filter((l: any) => l.status === 'open');
  const s = data.summary || {};

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* Welcome */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold">{greeting(user.full_name)}</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Here's what's on your plate.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads?view=mine" className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">
            🎯 Open my leads
          </Link>
          <Link href="/inbox" className="px-3 py-1.5 text-xs rounded-md bg-bg-card border border-bg-border hover:border-bg-borderhover">
            💬 WhatsApp inbox
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="My open leads" value={String(s.total_open || 0)} hint={`${s.qualified_open || 0} qualified · ${s.engaged_open || 0} engaged`} icon="kanban-square" />
        <KpiCard label="🔥 HOT" value={String(s.hot_open || 0)} hint={s.hot_open > 0 ? 'Action needed' : 'all clear'} icon="flame" accent={s.hot_open > 0} pulse={s.hot_open > 0} />
        <KpiCard label="Won (30d)" value={String(s.won_30d || 0)} hint={fmtINR(s.won_value_30d_inr)} icon="trophy" />
        <KpiCard label="Win rate (30d)" value={s.conversion_rate_30d_pct != null ? `${Math.round(s.conversion_rate_30d_pct)}%` : '—'} hint={`${s.won_30d || 0} won · ${s.lost_30d || 0} lost`} icon="trending-up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Hot leads queue */}
        <div className="lg:col-span-2 space-y-5">
          {hotLeads.length > 0 && (
            <section className="bg-bg-card border border-rose-500/30 rounded-lg p-5 shadow-[0_0_28px_rgba(244,63,94,0.10)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="text-sm font-semibold">🔥 Hot leads · need action now ({hotLeads.length})</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {hotLeads.slice(0, 6).map((l: any) => (
                  <Link key={l.phone} href={`/leads/${encodeURIComponent(l.phone)}`}
                    className="bg-bg-soft border border-rose-500/20 rounded-md p-3 hover:border-rose-500/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">🔥 {l.name || '(no name)'}</div>
                        <div className="text-[10px] text-slate-500 truncate font-mono">{l.phone}</div>
                      </div>
                      <div className="text-xs font-semibold text-accent-400">{l.score ?? '—'}</div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-bg-card text-slate-400 uppercase">{BRAND_LABEL[l.brand || ''] || l.brand}</span>
                      <span className="ml-auto">{timeAgo(l.created_at)} ago</span>
                    </div>
                  </Link>
                ))}
              </div>
              {hotLeads.length > 6 && (
                <Link href="/leads?view=mine" className="block mt-3 text-center text-[11px] text-rose-300 hover:underline">
                  See all {hotLeads.length} hot leads →
                </Link>
              )}
            </section>
          )}

          {/* Qualified queue */}
          {qualifiedLeads.length > 0 && (
            <section className="bg-bg-card border border-bg-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Qualified · ready to nurture ({qualifiedLeads.length})</h3>
              <div className="space-y-1.5">
                {qualifiedLeads.slice(0, 8).map((l: any) => (
                  <Link key={l.phone} href={`/leads/${encodeURIComponent(l.phone)}`}
                    className="flex items-center gap-3 px-3 py-2 rounded bg-bg-soft hover:bg-bg-cardhover border border-bg-border hover:border-bg-borderhover transition">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{l.name || l.phone}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{l.phone}</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-card text-slate-400 uppercase">{BRAND_LABEL[l.brand || ''] || l.brand}</span>
                    <span className="text-xs font-semibold text-accent-400 w-8 text-right">{l.score ?? '—'}</span>
                    <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(l.created_at)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {openLeads.length === 0 && (
            <section className="bg-bg-card/40 border border-dashed border-bg-border rounded-lg p-10 text-center">
              <Icons.Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" strokeWidth={1.25} />
              <div className="text-sm text-slate-400">No leads assigned to you yet.</div>
              <div className="text-[11px] text-slate-500 mt-1">When a WhatsApp lead is qualified, the AI auto-assigns it to you.</div>
            </section>
          )}
        </div>

        {/* Right: My recent activity */}
        <div className="space-y-5">
          <section className="bg-bg-card border border-bg-border rounded-lg p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">My recent activity</h3>
            {data.activity.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic">Nothing yet today.</div>
            ) : (
              <div className="space-y-2">
                {data.activity.slice(0, 8).map((a: any) => (
                  <Link key={a.id} href={`/leads/${encodeURIComponent(a.lead_phone)}`}
                    className="block px-2 py-1.5 rounded hover:bg-bg-soft transition">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                      <span className="uppercase tracking-wider">{a.activity_type.replace('_', ' ')}</span>
                      <span className="text-slate-700">·</span>
                      <span>{timeAgo(a.created_at)}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 line-clamp-2">{a.content}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="bg-accent-500/5 border border-accent-500/20 rounded-lg p-4">
            <div className="text-[10px] uppercase tracking-wider text-accent-300 mb-2">Quick tip</div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Mark a deal <strong className="text-accent-300">WON</strong> with the final amount → Vametrix tells Meta this lead was a buyer.
              Meta then optimizes ads to find more like them. Best possible ROAS feedback loop.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function greeting(name: string | null) {
  const h = new Date().getHours();
  const t = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${t}${name ? ', ' + name.split(' ')[0] : ''}`;
}

// ───────────────────── ADMIN HOME (engine overview) ─────────────────────
async function loadAdminOverview(tenantId: string) {
  try {
    const supa = supabaseAdmin();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBeforeYest = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: leads }, { data: conv }, { data: decs },
      { data: ads }, { data: adsCompare }, { data: recentActivity },
      { data: engineHealth }, { data: pipelineSummary }, { data: latestDigest },
    ] = await Promise.all([
      supa.from('leads_log').select('stage, created_at, score, phone, status, deal_value_inr, won_at').eq('tenant_id', tenantId),
      supa.from('conversations').select('id, created_at, direction').eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supa.from('perf_decisions').select('*').eq('approval_status', 'pending').order('decided_at', { ascending: false }).limit(5),
      supa.from('ad_campaigns_log').select('spend_inr, leads, campaign_name').eq('snapshot_date', yest),
      supa.from('ad_campaigns_log').select('spend_inr, leads').eq('snapshot_date', dayBeforeYest),
      supa.from('conversations').select('phone, direction, message, created_at, meta').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(8),
      supa.rpc('engine_health_summary', { p_tenant_id: tenantId }),
      supa.rpc('lead_pipeline_summary', { p_tenant_id: tenantId, p_owner_id: null }),
      supa.from('ceo_observations').select('summary,detail,observed_at').eq('tenant_id', tenantId).eq('observation_kind', 'digest').order('observed_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const stageCounts: Record<string, number> = { new: 0, engaged: 0, qualified: 0, hot: 0, escalate: 0, lost: 0 };
    let leadsToday = 0, leadsYesterday = 0;
    const yestStartIso = new Date(today.getTime() - 86400000).toISOString();
    const todayStartIso = today.toISOString();
    const byPhone = new Map<string, any>();
    for (const l of leads || []) {
      const p = (l as any).phone || '__noPhone';
      const existing = byPhone.get(p);
      if (!existing || ((l as any).created_at || '') > (existing.created_at || '')) byPhone.set(p, l);
    }
    const uniqueLeads = Array.from(byPhone.values());
    for (const l of uniqueLeads) {
      if (stageCounts[l.stage] !== undefined) stageCounts[l.stage]++;
      if (l.created_at >= todayStartIso) leadsToday++;
      else if (l.created_at >= yestStartIso) leadsYesterday++;
    }
    const spendYest = (ads || []).reduce((a, r) => a + (Number((r as any).spend_inr) || 0), 0);
    const leadsYest = (ads || []).reduce((a, r) => a + (Number((r as any).leads) || 0), 0);
    const spendPrev = (adsCompare || []).reduce((a, r) => a + (Number((r as any).spend_inr) || 0), 0);
    const leadsPrev = (adsCompare || []).reduce((a, r) => a + (Number((r as any).leads) || 0), 0);
    const cplYest = leadsYest > 0 ? spendYest / leadsYest : null;
    const cplPrev = leadsPrev > 0 ? spendPrev / leadsPrev : null;
    const inbound24h = (conv || []).filter(c => (c as any).direction === 'inbound').length;
    const outbound24h = (conv || []).filter(c => (c as any).direction === 'outbound').length;

    return {
      total: uniqueLeads.length, leadsToday, leadsYesterday,
      leadsTodayDelta: leadsYesterday > 0 ? Math.round(((leadsToday - leadsYesterday) / leadsYesterday) * 100) : null,
      stageCounts, conv24h: (conv || []).length, inbound24h, outbound24h, decs: decs || [],
      spendYest, leadsYest, cplYest, cplPrev,
      cplDelta: cplPrev && cplYest ? Math.round(((cplYest - cplPrev) / cplPrev) * 100) : null,
      activeCamps: (ads || []).length, recentActivity: recentActivity || [],
      engineHealth: Array.isArray(engineHealth) ? engineHealth[0] : engineHealth,
      pipelineSummary: Array.isArray(pipelineSummary) ? pipelineSummary[0] : pipelineSummary,
      latestDigest,
    };
  } catch {
    return null;
  }
}

function AdminHome({ data }: { data: any }) {
  const liveAgents = AGENTS.filter(a => a.status === 'live').length;
  const parkedAgents = AGENTS.filter(a => a.status === 'parked').length;
  const plannedAgents = AGENTS.filter(a => a.status === 'planned').length;
  const eh = data.engineHealth || {};
  const ps = data.pipelineSummary || {};
  const digest = data.latestDigest?.detail;

  return (
    <div className="max-w-[1500px] space-y-5">
      {/* Engine health hero */}
      <div className={`rounded-lg border p-5 ${
        eh.overall_status === 'CRITICAL' ? 'bg-rose-500/5 border-rose-500/30' :
        eh.overall_status === 'NEEDS_ATTENTION' ? 'bg-amber-500/5 border-amber-500/30' :
        eh.overall_status === 'HEALTHY' ? 'bg-accent-500/5 border-accent-500/30' :
        'bg-bg-card border-bg-border'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Engine state</div>
            <div className={`text-2xl font-semibold mt-1 ${
              eh.overall_status === 'CRITICAL' ? 'text-rose-400' :
              eh.overall_status === 'NEEDS_ATTENTION' ? 'text-amber-400' :
              eh.overall_status === 'HEALTHY' ? 'text-accent-400' : 'text-slate-400'
            }`}>{(eh.overall_status || 'IDLE').replace('_', ' ')}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {eh.healthy_count || 0} healthy · {eh.degraded_count || 0} degraded · {eh.stuck_count || 0} stuck · {eh.down_count || 0} down · {eh.no_activity_count || 0} idle
            </div>
            {digest && (
              <div className="mt-3 text-[12px] text-slate-300 italic max-w-2xl">
                "{digest.headline}"
              </div>
            )}
          </div>
          <Link href="/ceo" className="px-3 py-1.5 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 shrink-0">
            🛡 Open CEO →
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total leads" value={String(data.total)} hint={`+${data.leadsToday} today`} icon="users" delta={data.leadsTodayDelta} deltaLabel="vs yesterday" />
        <KpiCard label="🔥 Hot + Qualified" value={String(data.stageCounts.hot + data.stageCounts.qualified)} hint={`${data.stageCounts.hot} hot · ${data.stageCounts.qualified} qualified`} icon="flame" accent />
        <KpiCard label="Ad spend yest." value={fmtINR(data.spendYest)} hint={`${data.leadsYest} leads · CPL ${data.cplYest ? fmtINR(data.cplYest) : '—'}`} icon="trending-up" delta={data.cplDelta != null ? -data.cplDelta : null} deltaLabel="CPL vs prior" deltaInverse />
        <KpiCard label="Won (30d)" value={String(ps.won_30d || 0)} hint={fmtINR(ps.won_value_30d_inr)} icon="trophy" />
      </div>

      {/* Pipeline funnel */}
      <FunnelBar counts={data.stageCounts} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Live agents grid */}
          <section className="bg-bg-card border border-bg-border rounded-lg p-5">
            <SectionHeader title="Agents" subtitle={`${liveAgents} live · ${parkedAgents} parked · ${plannedAgents} planned`} right={<Link href="/ceo" className="text-[11px] text-accent-400 hover:underline">CEO view →</Link>} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
              {AGENTS.filter(a => a.status === 'live').map(a => <AgentCard key={a.id} agent={a} />)}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Recent activity */}
          <section className="bg-bg-card border border-bg-border rounded-lg p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Live activity</h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar">
              {(data.recentActivity || []).map((c: any, i: number) => <ActivityRow key={i} c={c} />)}
              {(data.recentActivity || []).length === 0 && (
                <div className="text-[11px] text-slate-500 italic px-1">No conversations yet today.</div>
              )}
            </div>
          </section>

          {/* Pending decisions */}
          {(data.decs || []).length > 0 && (
            <section className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-amber-300 mb-2">Perf decisions awaiting approval ({data.decs.length})</h3>
              <div className="space-y-1.5">
                {data.decs.map((d: any) => (
                  <Link key={d.id} href="/agent-8" className="block px-2 py-1.5 rounded bg-bg-card hover:bg-bg-cardhover">
                    <div className="text-[11px] font-medium">{d.action} · {d.campaign_name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{d.reason}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────── ENTRY ─────────────────────
export default async function Page() {
  const user = await getCurrentUser();
  const role = user?.role === 'master_admin' ? 'admin' : user?.role;

  if (!user) {
    return (
      <>
        <TopBar title="Vametrix Engine" />
        <div className="flex-1 flex items-center justify-center bg-bg p-6">
          <Link href="/login" className="px-6 py-3 rounded bg-accent-500/15 text-accent-300 border border-accent-500/30">
            Sign in →
          </Link>
        </div>
      </>
    );
  }

  if (role === 'team') {
    const data = await loadTeamHome(user.id, user.tenant_id);
    return (
      <>
        <TopBar title="My Today" breadcrumb={user.tenant_name || 'Cockpit'} />
        <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
          <TeamHome user={user} data={data} />
        </div>
      </>
    );
  }

  // admin
  const data = await loadAdminOverview(user.tenant_id);
  return (
    <>
      <TopBar title="Engine Overview" breadcrumb={user.tenant_name || 'Vametrix'} />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        {!data ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
            <strong>Supabase not configured.</strong> Set env vars in Vercel.
          </div>
        ) : <AdminHome data={data} />}
      </div>
    </>
  );
}

// ───────────────────── shared components ─────────────────────
function KpiCard({ label, value, hint, icon, accent, warn, muted, pulse, delta, deltaLabel, deltaInverse }: any) {
  const deltaShow = delta != null;
  const deltaPositive = deltaInverse ? (delta < 0) : (delta > 0);
  return (
    <div className={`bg-bg-card border rounded-lg p-4 transition ${accent ? 'border-accent-500/30' : warn ? 'border-rose-500/30' : 'border-bg-border'} ${pulse ? 'shadow-[0_0_28px_rgba(244,63,94,0.15)]' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <Icon name={icon} className={`w-3.5 h-3.5 ${accent ? 'text-accent-400' : warn ? 'text-rose-400' : 'text-slate-500'}`} />
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${accent ? 'text-accent-400' : warn ? 'text-rose-400' : muted ? 'text-slate-500' : 'text-slate-100'}`}>{value}</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-[10px] text-slate-500 truncate">{hint}</div>
        {deltaShow && (
          <div className={`text-[10px] font-mono tabular-nums shrink-0 ${deltaPositive ? 'text-accent-400' : 'text-rose-400'}`}>
            {delta > 0 ? '+' : ''}{delta}%
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: any }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function ActivityRow({ c }: { c: any }) {
  const isIn = c.direction === 'inbound';
  const ts = c.created_at ? new Date(c.created_at) : null;
  const minutesAgo = ts ? Math.floor((Date.now() - ts.getTime()) / 60000) : null;
  const ago = minutesAgo == null ? '—' : minutesAgo < 1 ? 'now' : minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo / 60)}h`;
  return (
    <Link href={`/leads/${encodeURIComponent(c.phone)}`} className="block bg-bg-soft border border-bg-border rounded px-2.5 py-2 hover:bg-bg-cardhover transition">
      <div className="flex items-center gap-2 text-[10px] mb-0.5">
        <span className={`font-medium ${isIn ? 'text-sky-400' : 'text-accent-400'}`}>
          {isIn ? '← IN' : '→ OUT'}
        </span>
        <span className="text-slate-600 font-mono truncate">{(c.phone || '').slice(-10)}</span>
        <span className="ml-auto text-slate-600 font-mono">{ago}</span>
      </div>
      <div className="text-[11px] text-slate-400 line-clamp-1 leading-snug">{c.message || '(no body)'}</div>
    </Link>
  );
}

function FunnelBar({ counts }: { counts: Record<string, number> }) {
  const order = ['new', 'engaged', 'qualified', 'hot', 'escalate', 'lost'];
  const total = order.reduce((a, k) => a + (counts[k] || 0), 0);
  const palette: Record<string, { bg: string; text: string }> = {
    new:       { bg: 'bg-slate-600',   text: 'text-slate-300' },
    engaged:   { bg: 'bg-sky-500',     text: 'text-sky-300' },
    qualified: { bg: 'bg-violet-500',  text: 'text-violet-300' },
    hot:       { bg: 'bg-rose-500',    text: 'text-rose-300' },
    escalate:  { bg: 'bg-amber-500',   text: 'text-amber-300' },
    lost:      { bg: 'bg-slate-700',   text: 'text-slate-400' },
  };
  if (total === 0) return null;
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
    <Link href={`/${a.id}`} className="text-left bg-bg-soft hover:bg-bg-cardhover border border-bg-border hover:border-bg-borderhover rounded-lg p-3 transition group block">
      <div className="flex items-start gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-md ${m.bg} ${m.color} flex items-center justify-center shrink-0`}>
          <Icon name={a.icon} className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono text-slate-500">#{String(a.num).padStart(2, '0')} · {a.fleet.split(' ')[0]}</div>
          <div className="text-xs font-medium text-slate-200 truncate">{a.name}</div>
        </div>
        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${m.bg} ${m.color}`}>{m.label}</span>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{a.desc}</p>
    </Link>
  );
}
