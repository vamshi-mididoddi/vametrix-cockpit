// VAMETRIX Sales OS — live pipeline, conversations, escalations.
// Reads the Sales platform tables (sales_*), not the legacy engine.
import Link from 'next/link';
import { defaultOrg, salesDb } from '@/lib/salesos';

export const dynamic = 'force-dynamic';

const STAGES = ['new', 'engaged', 'qualifying', 'qualified', 'quoted', 'negotiating', 'meeting_scheduled', 'won', 'lost', 'dormant'] as const;
const STAGE_COLORS: Record<string, string> = {
  new: 'bg-sky-500', engaged: 'bg-blue-500', qualifying: 'bg-indigo-500',
  qualified: 'bg-violet-500', quoted: 'bg-fuchsia-500', negotiating: 'bg-pink-500',
  meeting_scheduled: 'bg-amber-500', won: 'bg-emerald-500', lost: 'bg-zinc-600', dormant: 'bg-zinc-500',
};

export default async function SalesOsPage() {
  const org = await defaultOrg();
  const db = salesDb();

  const [{ data: leads }, { data: escalations }, { data: messages }, { data: quotes }] = await Promise.all([
    db.from('sales_leads')
      .select('id,status,score,source,created_at,value_estimate,sales_contacts(full_name,phone,company)')
      .eq('org_id', org.id).order('updated_at', { ascending: false }).limit(50),
    db.from('sales_escalations')
      .select('id,trigger,summary,status,created_at')
      .eq('org_id', org.id).eq('status', 'open').order('created_at', { ascending: false }).limit(10),
    db.from('sales_messages')
      .select('direction,content_type,body,created_at,conversation_id')
      .eq('org_id', org.id).order('created_at', { ascending: false }).limit(15),
    db.from('sales_quotes')
      .select('quote_number,total,currency,status,created_at')
      .eq('org_id', org.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const byStage: Record<string, number> = {};
  for (const l of leads ?? []) byStage[l.status] = (byStage[l.status] ?? 0) + 1;
  const total = (leads ?? []).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">VAMETRIX Sales OS · {org.name}</div>
          <h1 className="text-2xl font-semibold text-white mt-1">Sales Pipeline</h1>
        </div>
        <Link href="/sales/settings"
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-200 hover:bg-white/10 transition">
          ⚙ Client Settings — knowledge, catalog, integrations
        </Link>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAGES.filter(s => byStage[s]).map(stage => (
          <div key={stage} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage]}`} />
              <span className="text-xs uppercase tracking-wider text-zinc-400">{stage.replace('_', ' ')}</span>
            </div>
            <div className="text-2xl font-semibold text-white mt-2">{byStage[stage]}</div>
          </div>
        ))}
        {total === 0 && (
          <div className="col-span-full rounded-xl border border-white/10 bg-white/[0.03] p-6 text-zinc-400 text-sm">
            No leads yet — they appear here the moment anyone messages the WhatsApp number or a form/API lead arrives.
          </div>
        )}
      </div>

      {/* Open escalations */}
      {(escalations ?? []).length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-sm font-medium text-amber-300 mb-3">🔺 Needs a human ({escalations!.length})</div>
          <div className="space-y-2">
            {escalations!.map(e => (
              <div key={e.id} className="text-sm text-zinc-300">
                <span className="text-amber-400 font-mono text-xs mr-2">[{e.trigger}]</span>{e.summary}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Leads table */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200">Leads</div>
          <div className="divide-y divide-white/5 max-h-[28rem] overflow-y-auto">
            {(leads ?? []).map(l => {
              const c: any = l.sales_contacts;
              return (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{c?.full_name ?? c?.phone ?? 'Unknown'}</div>
                    <div className="text-xs text-zinc-500">{c?.company ?? c?.phone} · via {l.source}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-400">score {l.score}</span>
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${STAGE_COLORS[l.status] ?? 'bg-zinc-600'}`}>
                      {l.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
            {total === 0 && <div className="px-4 py-6 text-sm text-zinc-500">Empty</div>}
          </div>
        </div>

        {/* Live conversation feed + quotes */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200">Live conversation feed</div>
            <div className="divide-y divide-white/5 max-h-[18rem] overflow-y-auto">
              {(messages ?? []).map((m, i) => (
                <div key={i} className="px-4 py-2.5">
                  <span className={`text-xs font-mono mr-2 ${m.direction === 'inbound' ? 'text-sky-400' : 'text-emerald-400'}`}>
                    {m.direction === 'inbound' ? '← customer' : '→ AI'}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {(m.body ?? `[${m.content_type}]`).slice(0, 90)}
                  </span>
                </div>
              ))}
              {(messages ?? []).length === 0 && <div className="px-4 py-6 text-sm text-zinc-500">No messages yet</div>}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200">Recent quotes</div>
            <div className="divide-y divide-white/5">
              {(quotes ?? []).map(q => (
                <div key={q.quote_number} className="px-4 py-2.5 flex justify-between text-sm">
                  <span className="text-zinc-300 font-mono">{q.quote_number}</span>
                  <span className="text-white">{q.currency} {Number(q.total).toLocaleString()}</span>
                  <span className="text-zinc-400">{q.status}</span>
                </div>
              ))}
              {(quotes ?? []).length === 0 && <div className="px-4 py-6 text-sm text-zinc-500">No quotes yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
