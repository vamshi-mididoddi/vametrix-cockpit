import { TopBar } from '@/components/topbar';
import { STAGE_META, BRAND_LABEL } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { StageControl } from './stage-control';

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
  status?: string | null;
  owner_id?: string | null;
  priority?: string | null;
  meta?: any;
  created_at?: string;
  last_action_at?: string | null;
  deal_value_inr?: number | null;
  won_reason?: string | null;
  lost_reason?: string | null;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

async function loadLeads(tenantId: string, ownerOnly?: string) {
  const supa = supabaseAdmin();
  let q = supa
    .from('leads_log')
    .select('phone,name,brand,stage,score,language,source,status,owner_id,priority,meta,created_at,last_action_at,deal_value_inr,won_reason,lost_reason')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (ownerOnly) q = q.eq('owner_id', ownerOnly);
  const { data, error } = await q;
  if (error) return [];
  const seen = new Set<string>();
  const deduped: Lead[] = [];
  for (const l of (data || []) as Lead[]) {
    if (!l.phone || seen.has(l.phone)) continue;
    seen.add(l.phone);
    deduped.push(l);
  }
  return deduped;
}

async function loadOwners(tenantId: string) {
  const supa = supabaseAdmin();
  const { data } = await supa.from('user_profiles').select('id,full_name,role').eq('tenant_id', tenantId).in('role', ['admin','team']);
  const map: Record<string, string> = {};
  for (const u of (data || [])) map[(u as any).id] = (u as any).full_name || '(no name)';
  return map;
}

export default async function Page({ searchParams }: { searchParams?: { view?: string } }) {
  const user = await getCurrentUser();
  const tenantId = user?.tenant_id || '00000000-0000-0000-0000-befac0000001';
  const viewMine = searchParams?.view === 'mine';
  const showClosed = searchParams?.view === 'closed';

  const [leads, ownerMap] = await Promise.all([
    loadLeads(tenantId, viewMine && user ? user.id : undefined),
    loadOwners(tenantId),
  ]);

  const filteredLeads = leads.filter(l => {
    if (showClosed) return l.status === 'won' || l.status === 'lost';
    return l.status !== 'won' && l.status !== 'lost';
  });

  const byStage: Record<string, Lead[]> = Object.fromEntries(STAGES.map(s => [s, []]));
  for (const l of filteredLeads) {
    const stage = (l.stage && STAGES.includes(l.stage as any)) ? l.stage : 'new';
    byStage[stage].push(l);
  }

  const hotCount = filteredLeads.filter(l => l.stage === 'hot').length;
  const wonCount = leads.filter(l => l.status === 'won').length;
  const lostCount = leads.filter(l => l.status === 'lost').length;

  return (
    <>
      <TopBar title="Lead Pipeline" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {filteredLeads.length} {viewMine ? 'leads assigned to you' : showClosed ? 'closed deals' : 'open leads'}
              {hotCount > 0 && !showClosed && (
                <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> {hotCount} HOT
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Click a card to open lead detail · mark Won/Lost · fire CAPI</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-bg-card border border-bg-border rounded-md p-0.5">
              <Link href="/leads" className={`px-3 py-1 text-[11px] rounded ${!viewMine && !showClosed ? 'bg-accent-500/15 text-accent-300' : 'text-slate-400 hover:text-slate-200'}`}>All open</Link>
              <Link href="/leads?view=mine" className={`px-3 py-1 text-[11px] rounded ${viewMine ? 'bg-accent-500/15 text-accent-300' : 'text-slate-400 hover:text-slate-200'}`}>My leads</Link>
              <Link href="/leads?view=closed" className={`px-3 py-1 text-[11px] rounded ${showClosed ? 'bg-accent-500/15 text-accent-300' : 'text-slate-400 hover:text-slate-200'}`}>Closed ({wonCount + lostCount})</Link>
            </div>
            <Link href="/inbox" className="px-3 py-1.5 text-xs rounded-md bg-bg-card border border-bg-border hover:border-bg-borderhover">Open Inbox →</Link>
          </div>
        </div>

        {showClosed ? (
          <ClosedTable leads={filteredLeads} ownerMap={ownerMap} />
        ) : (
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
                        const isHot = l.stage === 'hot';
                        const ownerName = l.owner_id ? ownerMap[l.owner_id] : null;
                        const isMine = user && l.owner_id === user.id;
                        return (
                          <Link
                            key={l.phone}
                            href={`/leads/${encodeURIComponent(l.phone)}`}
                            className={`block bg-bg-card hover:bg-bg-cardhover border rounded-md p-3 transition ${
                              isHot
                                ? 'border-rose-500/40 shadow-[0_0_18px_rgba(244,63,94,0.18)]'
                                : 'border-bg-border hover:border-bg-borderhover'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate text-slate-200">
                                  {isHot && <span className="mr-1 inline-block animate-pulse">🔥</span>}
                                  {l.name || '(no name)'}
                                </div>
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
                              {l.priority && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
                                  l.priority === 'High' ? 'bg-rose-500/15 text-rose-300' :
                                  l.priority === 'Medium' ? 'bg-amber-500/15 text-amber-300' :
                                  'bg-slate-700/30 text-slate-400'
                                }`}>{l.priority}</span>
                              )}
                              <span className="ml-auto">
                                <StageControl phone={l.phone} currentStage={l.stage || 'new'} />
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <div className="text-[10px] text-slate-500 truncate">
                                {ownerName ? (
                                  <span className={isMine ? 'text-accent-400' : ''}>
                                    👤 {ownerName}{isMine ? ' (you)' : ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 italic">unassigned</span>
                                )}
                              </div>
                              {l.created_at && <div className="text-[10px] text-slate-600 shrink-0">{timeAgo(l.created_at)} ago</div>}
                            </div>
                            {reason && <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 leading-snug">{String(reason).slice(0, 140)}</div>}
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ClosedTable({ leads, ownerMap }: { leads: Lead[]; ownerMap: Record<string, string> }) {
  const won = leads.filter(l => l.status === 'won');
  const lost = leads.filter(l => l.status === 'lost');
  const wonValue = won.reduce((s, l) => s + (Number(l.deal_value_inr) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card border border-accent-500/30 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-accent-300">WON · revenue</div>
          <div className="text-2xl font-semibold text-accent-400 mt-1">₹{wonValue.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500 mt-1">{won.length} deals</div>
        </div>
        <div className="bg-bg-card border border-rose-500/30 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-rose-300">LOST</div>
          <div className="text-2xl font-semibold text-rose-400 mt-1">{lost.length}</div>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Win rate</div>
          <div className="text-2xl font-semibold mt-1">{won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0}%</div>
        </div>
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-soft border-b border-bg-border">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="text-left py-2 px-3">Lead</th>
              <th className="text-left py-2 px-3">Brand</th>
              <th className="text-left py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Deal value</th>
              <th className="text-left py-2 px-3">Owner</th>
              <th className="text-left py-2 px-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.phone} className="border-b border-bg-border hover:bg-bg-cardhover">
                <td className="py-2 px-3">
                  <Link href={`/leads/${encodeURIComponent(l.phone)}`} className="text-xs hover:text-accent-300">
                    {l.name || '(no name)'} <span className="text-[10px] text-slate-500 font-mono">· {l.phone}</span>
                  </Link>
                </td>
                <td className="py-2 px-3 text-[11px]">{BRAND_LABEL[l.brand || ''] || l.brand || '—'}</td>
                <td className="py-2 px-3">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                    l.status === 'won' ? 'bg-accent-500/15 text-accent-300' : 'bg-rose-500/15 text-rose-300'
                  }`}>{l.status}</span>
                </td>
                <td className="py-2 px-3 text-right text-xs font-mono">
                  {l.deal_value_inr ? `₹${Number(l.deal_value_inr).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="py-2 px-3 text-[11px]">{l.owner_id ? ownerMap[l.owner_id] || '—' : 'unassigned'}</td>
                <td className="py-2 px-3 text-[10px] text-slate-500 line-clamp-1">{l.won_reason || l.lost_reason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
