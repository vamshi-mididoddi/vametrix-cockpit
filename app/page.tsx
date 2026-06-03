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

    const [{ data: leads }, { data: conv }, { data: decs }, { data: ads }] = await Promise.all([
      supa.from('leads_log').select('stage, created_at, score'),
      supa.from('conversations').select('id').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supa.from('perf_decisions').select('*').eq('approval_status', 'pending').order('decided_at', { ascending: false }).limit(5),
      supa.from('ad_campaigns_log').select('spend_inr, leads, campaign_name').eq('snapshot_date', yest),
    ]);

    const stageCounts: Record<string, number> = { new: 0, engaged: 0, qualified: 0, hot: 0, escalate: 0, lost: 0 };
    let leadsToday = 0;
    for (const l of leads || []) {
      if (stageCounts[l.stage] !== undefined) stageCounts[l.stage]++;
      if (l.created_at >= today.toISOString()) leadsToday++;
    }
    const spendYest = (ads || []).reduce((a, r) => a + (Number(r.spend_inr) || 0), 0);
    const leadsYest = (ads || []).reduce((a, r) => a + (Number(r.leads) || 0), 0);
    return {
      total: (leads || []).length,
      leadsToday,
      stageCounts,
      conv24h: (conv || []).length,
      decs: decs || [],
      spendYest,
      leadsYest,
      activeCamps: (ads || []).length,
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total leads" value={String(data.total)} hint={`+${data.leadsToday} today`} />
            <KpiCard label="Hot + Qualified" value={String(data.stageCounts.hot + data.stageCounts.qualified)} hint={`${data.stageCounts.hot} hot · ${data.stageCounts.qualified} qualified`} accent />
            <KpiCard label="Pending escalation" value={String(data.stageCounts.escalate)} hint="requires human" warn />
            {isAdmin ? (
              <KpiCard label="Ad spend yesterday" value={fmtINR(data.spendYest)} hint={`${data.leadsYest} leads · CPL ${data.leadsYest > 0 ? fmtINR(data.spendYest / data.leadsYest) : '—'}`} />
            ) : (
              <KpiCard label="Engaged conversations" value={String(data.conv24h)} hint="last 24h" />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">{isAdmin ? 'Agent fleet' : 'Live agents'}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isAdmin ? `${liveAgents} live · ${parkedAgents} parked · ${plannedAgents} planned` : `${liveAgents} agents actively running for you`}
                </p>
              </div>
              {isAdmin && <div className="text-[10px] text-slate-500 font-mono">{AGENTS.length} agents total</div>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleAgents.map(a => <AgentCard key={a.id} agent={a} />)}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold tracking-tight mb-3">Pending decisions</h2>
              {!data || data.decs.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-bg-card border border-bg-border rounded-lg">No pending recommendations.</div>
              ) : (
                <>
                  {data.decs.map((d: any) => (
                    <div key={d.id} className="bg-bg-card border border-bg-border rounded-lg p-3 mb-2 hover:border-bg-borderhover transition">
                      <div className="text-xs font-medium truncate">{d.campaign_name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{(d.reason || '').slice(0, 140)}</div>
                    </div>
                  ))}
                  <Link href="/agent-8" className="text-[11px] text-accent-400 hover:text-accent-300">
                    View all in Perf Marketer →
                  </Link>
                </>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold tracking-tight mb-3">Today's activity</h2>
              <div className="bg-bg-card border border-bg-border rounded-lg p-4 space-y-3 text-xs">
                <Row label="New leads" value={String(data?.leadsToday ?? '—')} />
                <Row label="Conversations (24h)" value={String(data?.conv24h ?? '—')} />
                <Row label="Active campaigns" value={String(data?.activeCamps ?? '—')} />
                <Row label="Engine health" value="Nominal" valueClass="text-accent-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ label, value, hint, accent, warn }: { label: string; value: string; hint?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="grad-card border border-bg-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-accent-400' : warn ? 'text-amber-400' : ''}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

function AgentCard({ agent: a }: { agent: Agent }) {
  const m = STATUS_META[a.status];
  return (
    <Link href={`/${a.id}`} className="text-left bg-bg-card hover:bg-bg-cardhover border border-bg-border hover:border-bg-borderhover rounded-lg p-3.5 transition group block">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-md ${m.bg} ${m.color} flex items-center justify-center shrink-0`}>
            <Icon name={a.icon} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-500">#{String(a.num).padStart(2, '0')}</div>
            <div className="text-xs font-medium text-slate-200 truncate">{a.name}</div>
          </div>
        </div>
        <span className={`stage-badge ${m.bg} ${m.color} ${m.border} border shrink-0`}>
          <span className={`w-1 h-1 rounded-full ${m.dot}`} />
          {m.label}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{a.desc}</p>
    </Link>
  );
}
