import { TopBar } from '@/components/topbar';
import { STAGE_META, BRAND_LABEL } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STAGES = ['new', 'engaged', 'qualified', 'hot', 'escalate', 'lost'] as const;

interface Lead {
  phone: string;
  name?: string | null;
  brand?: string | null;
  stage?: string | null;
  score?: number | null;
  language?: string | null;
  source?: string | null;
  meta?: any;
  created_at?: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

async function loadLeads() {
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from('leads_log')
    .select('phone,name,brand,stage,score,language,source,meta,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return [];
  // Dedup by phone — keep most recent row per phone (leads_log has multi-row-per-phone bug)
  const seen = new Set<string>();
  const deduped: Lead[] = [];
  for (const l of (data || []) as Lead[]) {
    if (!l.phone || seen.has(l.phone)) continue;
    seen.add(l.phone);
    deduped.push(l);
  }
  return deduped;
}

export default async function Page() {
  const leads = await loadLeads();
  const byStage: Record<string, Lead[]> = Object.fromEntries(STAGES.map(s => [s, []]));
  for (const l of leads) {
    const stage = (l.stage && STAGES.includes(l.stage as any)) ? l.stage : 'new';
    byStage[stage].push(l);
  }

  return (
    <>
      <TopBar title="Lead Pipeline" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{leads.length} leads across {STAGES.length} stages</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Click a card to open the full conversation</p>
          </div>
          <div className="flex gap-2">
            <Link href="/broadcast" className="px-3 py-1.5 text-xs rounded-md bg-accent-500/10 text-accent-400 border border-accent-500/30 hover:bg-accent-500/20">+ Broadcast</Link>
            <Link href="/inbox" className="px-3 py-1.5 text-xs rounded-md bg-bg-card border border-bg-border hover:border-bg-borderhover">Open Inbox →</Link>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map(s => {
            const m = STAGE_META[s];
            const items = byStage[s] || [];
            return (
              <div key={s} className="kanban-col flex flex-col shrink-0">
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${m.color}`}>{m.label}</h3>
                  <span className="text-[10px] text-slate-600 ml-auto font-mono">{items.length}</span>
                </div>
                <div className="space-y-1.5 flex-1 overflow-y-auto scrollbar max-h-[calc(100vh-220px)] pr-1">
                  {items.length === 0 ? (
                    <div className="text-[10px] text-slate-600 italic px-1">empty</div>
                  ) : (
                    items.slice(0, 50).map(l => {
                      const reason = (l.meta && (l.meta.escalation_reason || l.meta.last_internal_notes)) || '';
                      const score = l.score ?? null;
                      return (
                        <Link
                          key={l.phone}
                          href={`/inbox?phone=${encodeURIComponent(l.phone)}`}
                          className="block bg-bg-card hover:bg-bg-cardhover border border-bg-border hover:border-bg-borderhover rounded-md p-3 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate text-slate-200">{l.name || '(no name)'}</div>
                              <div className="text-[11px] text-slate-500 truncate font-mono">{l.phone}</div>
                            </div>
                            <div className={`text-[11px] font-semibold ${score != null && score >= 70 ? 'text-accent-400' : score != null && score >= 40 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {score ?? '—'}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium uppercase">
                              {BRAND_LABEL[l.brand || ''] || l.brand || 'unknown'}
                            </span>
                            {l.language && <span className="text-[10px] text-slate-500">· {l.language}</span>}
                          </div>
                          {reason && <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-snug">{String(reason).slice(0, 140)}</div>}
                          {l.created_at && <div className="mt-1.5 text-[10px] text-slate-600">{timeAgo(l.created_at)} ago</div>}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
