import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Event = {
  kind: string;
  ts: string;
  who: string;
  what: string;
  meta?: any;
  phone?: string | null;
  cls: string;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

async function load() {
  const supa = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: agentRuns },
    { data: convs },
    { data: decs },
    { data: optOuts },
    { data: reminders },
  ] = await Promise.all([
    supa.from('agent_runs').select('created_at,agent,status,meta').gte('created_at', since).order('created_at', { ascending: false }).limit(200),
    supa.from('conversations').select('created_at,phone,direction,message,meta').gte('created_at', since).order('created_at', { ascending: false }).limit(500),
    supa.from('perf_decisions').select('decided_at,approved_at,action,campaign_name,approval_status,reason').gte('decided_at', since).order('decided_at', { ascending: false }).limit(100),
    supa.from('lead_opt_outs').select('opted_out_at,phone,source,reason').gte('opted_out_at', since).order('opted_out_at', { ascending: false }).limit(100),
    supa.from('scheduled_reminders').select('created_at,fired_at,scheduled_at,phone,kind,status').gte('created_at', since).order('created_at', { ascending: false }).limit(100),
  ]);

  const events: Event[] = [];

  for (const c of (convs || []) as any[]) {
    const src = c.meta?.source;
    if (c.direction === 'outbound') {
      if (src === 'vametrix_11_smart_followup_v4') events.push({
        kind: 'nurture', ts: c.created_at, who: 'agent #11', phone: c.phone,
        what: `${c.meta?.nurture_lifecycle || ''} nurture sent`, meta: c.meta, cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      });
      else if (src === 'vametrix_51_send_template') events.push({
        kind: 'template_send', ts: c.created_at, who: 'agent #51', phone: c.phone,
        what: `template "${c.meta?.template_name || '—'}" sent`, meta: c.meta, cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
      });
      else if (src === 'cockpit_human_takeover') events.push({
        kind: 'human_send', ts: c.created_at, who: 'cockpit', phone: c.phone,
        what: 'human take-over reply', meta: c.meta, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      });
      else if (src === 'vametrix_43_reminder') events.push({
        kind: 'reminder_fire', ts: c.created_at, who: 'agent #43', phone: c.phone,
        what: `reminder fired (${c.meta?.reminder_kind || ''})`, meta: c.meta, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      });
      else if (src === 'meta_cloud_api_auto') events.push({
        kind: 'auto_reply', ts: c.created_at, who: 'agent #1', phone: c.phone,
        what: `qualifier auto-reply (stage: ${c.meta?.stage || '?'})`, meta: c.meta, cls: 'bg-accent-500/15 text-accent-300 border-accent-500/30',
      });
    } else if (c.direction === 'inbound') {
      const adId = c.meta?.ad_source_id;
      events.push({
        kind: 'inbound', ts: c.created_at, who: 'customer', phone: c.phone,
        what: adId ? `inbound (from ad ${adId})` : 'inbound message', meta: c.meta, cls: 'bg-slate-700/30 text-slate-300 border-slate-700',
      });
    }
  }

  for (const d of (decs || []) as any[]) {
    events.push({
      kind: 'decision_made', ts: d.decided_at, who: 'agent #8',
      what: `recommended ${d.action} on "${d.campaign_name}"`, meta: { reason: d.reason },
      cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    });
    if (d.approved_at && d.approval_status !== 'pending') {
      events.push({
        kind: 'decision_resolved', ts: d.approved_at, who: 'cockpit',
        what: `${d.approval_status} ${d.action} on "${d.campaign_name}"`, meta: {},
        cls: d.approval_status === 'approved' ? 'bg-accent-500/15 text-accent-300 border-accent-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      });
    }
  }

  for (const o of (optOuts || []) as any[]) {
    events.push({
      kind: 'opt_out', ts: o.opted_out_at, who: 'engine', phone: o.phone,
      what: `opted out (${o.source})`, meta: { reason: o.reason },
      cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    });
  }

  for (const r of (reminders || []) as any[]) {
    events.push({
      kind: 'reminder_scheduled', ts: r.created_at, who: 'cockpit', phone: r.phone,
      what: `${r.kind} reminder scheduled for ${fmt(r.scheduled_at)}`, meta: { status: r.status },
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    });
  }

  for (const a of (agentRuns || []) as any[]) {
    events.push({
      kind: 'agent_run', ts: a.created_at, who: a.agent, what: `${a.status}`, meta: a.meta,
      cls: 'bg-slate-700/30 text-slate-300 border-slate-700',
    });
  }

  events.sort((x, y) => y.ts.localeCompare(x.ts));
  return events;
}

export default async function Page() {
  await requireAdmin();
  const events = await load();
  return (
    <>
      <TopBar title="Audit Log" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-5xl">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">{events.length} events · last 7 days</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Every engine action, decision, and human takeover — chronologically.</p>
          </div>
          <div className="bg-bg-card border border-bg-border rounded-lg divide-y divide-bg-border">
            {events.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 italic">No events.</div>
            ) : events.slice(0, 300).map((e, i) => (
              <div key={i} className="px-4 py-3 hover:bg-bg-cardhover transition flex items-start gap-3">
                <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap w-32 shrink-0">{fmt(e.ts)}</div>
                <span className={`stage-badge border ${e.cls} shrink-0`}>{e.who}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-200">{e.what}</div>
                  {e.phone && (
                    <Link href={`/inbox?phone=${encodeURIComponent(e.phone)}`} className="text-[10px] font-mono text-slate-500 hover:text-accent-400">
                      {e.phone}
                    </Link>
                  )}
                </div>
                <span className="text-[10px] uppercase text-slate-600 font-mono tracking-wider whitespace-nowrap">{e.kind}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
