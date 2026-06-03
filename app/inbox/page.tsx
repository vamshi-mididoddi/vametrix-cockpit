import { TopBar } from '@/components/topbar';
import { STAGE_META, BRAND_LABEL } from '@/lib/agents';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { ComposeBox } from './compose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Message {
  id?: string | number;
  phone: string;
  direction: 'inbound' | 'outbound';
  message: string;
  meta?: any;
  created_at: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

async function loadThreads(selectedPhone?: string) {
  const supa = supabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recent } = await supa
    .from('conversations')
    .select('phone,direction,message,meta,created_at')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(2000);

  const threads: Record<string, { phone: string; msgs: Message[]; latest: string }> = {};
  for (const m of (recent || []) as Message[]) {
    if (!threads[m.phone]) threads[m.phone] = { phone: m.phone, msgs: [], latest: m.created_at };
    threads[m.phone].msgs.push(m);
  }
  const threadList = Object.values(threads).sort((a, b) => b.latest.localeCompare(a.latest));

  // Pull leads for badges
  const phones = threadList.map(t => t.phone);
  let leadByPhone: Record<string, any> = {};
  if (phones.length > 0) {
    const { data: leads } = await supa
      .from('leads_log')
      .select('phone,name,brand,stage,score,language')
      .in('phone', phones)
      .order('created_at', { ascending: false });
    for (const l of (leads || []) as any[]) {
      if (!leadByPhone[l.phone]) leadByPhone[l.phone] = l;
    }
  }

  // Selected thread: full chronological
  let selectedMsgs: Message[] = [];
  let selectedLead: any = null;
  let statusByMsgId: Record<string, string> = {};
  const sel = selectedPhone || (threadList[0]?.phone);
  if (sel) {
    const { data: full } = await supa
      .from('conversations')
      .select('phone,direction,message,meta,created_at')
      .eq('phone', sel)
      .order('created_at', { ascending: true })
      .limit(500);
    selectedMsgs = (full || []) as Message[];
    selectedLead = leadByPhone[sel] || null;

    // Pull delivery / read / failed receipts for this phone, build map by meta_message_id
    const { data: statuses } = await supa
      .from('wa_message_status')
      .select('meta_message_id,status,created_at')
      .eq('phone', sel)
      .order('created_at', { ascending: true });
    const priority: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 4 };
    for (const s of (statuses || []) as any[]) {
      if (!s.meta_message_id) continue;
      const cur = statusByMsgId[s.meta_message_id];
      if (!cur || (priority[s.status] || 0) > (priority[cur] || 0)) {
        statusByMsgId[s.meta_message_id] = s.status;
      }
    }
  }

  return { threadList, leadByPhone, selectedPhone: sel, selectedMsgs, selectedLead, statusByMsgId };
}

function statusIndicator(status: string | undefined) {
  if (!status) return { icon: '⏱', cls: 'text-slate-500', label: 'pending' };
  if (status === 'sent')      return { icon: '✓',  cls: 'text-slate-400', label: 'sent' };
  if (status === 'delivered') return { icon: '✓✓', cls: 'text-slate-400', label: 'delivered' };
  if (status === 'read')      return { icon: '✓✓', cls: 'text-sky-400',   label: 'READ' };
  if (status === 'failed')    return { icon: '✗',  cls: 'text-rose-400',  label: 'FAILED' };
  return { icon: status, cls: 'text-slate-500', label: status };
}

export default async function Page({ searchParams }: { searchParams: { phone?: string } }) {
  const { threadList, leadByPhone, selectedPhone, selectedMsgs, selectedLead, statusByMsgId } = await loadThreads(searchParams.phone);

  return (
    <>
      <TopBar title="WhatsApp Inbox" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-hidden bg-bg p-4">
        <div className="grid grid-cols-12 gap-3 h-full">
          {/* Threads list */}
          <div className="col-span-12 lg:col-span-4 bg-bg-card border border-bg-border rounded-lg flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-bg-border flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Threads (last 7d)</div>
              <div className="text-[10px] text-slate-500 font-mono">{threadList.length}</div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar">
              {threadList.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3">No recent conversations.</div>
              ) : threadList.map(t => {
                const lead = leadByPhone[t.phone];
                const last = t.msgs[0];
                const preview = (last?.message || '').replace(/\s+/g, ' ').slice(0, 70);
                const dirIcon = last?.direction === 'inbound' ? '←' : '→';
                const sm = STAGE_META[lead?.stage as string] || STAGE_META.new;
                const active = t.phone === selectedPhone;
                return (
                  <Link
                    key={t.phone}
                    href={`/inbox?phone=${encodeURIComponent(t.phone)}`}
                    className={`block border-b border-bg-border px-3 py-2.5 hover:bg-bg-cardhover transition ${active ? 'bg-bg-cardhover' : ''}`}
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <div className="text-xs font-medium text-slate-200 truncate">{lead?.name || '(no name)'}</div>
                      <div className="text-[10px] text-slate-500">{last && timeAgo(last.created_at)}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-mono">{t.phone}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{dirIcon} {preview}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {lead?.stage && <span className={`stage-badge ${sm.bg} ${sm.color}`}>{sm.label}</span>}
                      <span className="text-[10px] text-slate-600">{t.msgs.length} msgs</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Conversation view */}
          <div className="col-span-12 lg:col-span-8 bg-bg-card border border-bg-border rounded-lg flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-bg-border">
              {selectedPhone ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {(selectedLead?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{selectedLead?.name || '(no name)'}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{selectedPhone}</div>
                  </div>
                  {selectedLead?.stage && (
                    <span className={`stage-badge ${STAGE_META[selectedLead.stage]?.bg || ''} ${STAGE_META[selectedLead.stage]?.color || ''}`}>
                      {STAGE_META[selectedLead.stage]?.label}
                    </span>
                  )}
                  {selectedLead?.brand && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {BRAND_LABEL[selectedLead.brand] || selectedLead.brand}
                    </span>
                  )}
                  {selectedLead?.score != null && (
                    <span className={`text-xs font-semibold ${selectedLead.score >= 70 ? 'text-accent-400' : 'text-slate-400'}`}>
                      {selectedLead.score}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Select a thread to view conversation</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-3" style={{ minHeight: 0 }}>
              {selectedMsgs.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No messages.</div>
              ) : selectedMsgs.map((m, i) => {
                const isIn = m.direction === 'inbound';
                const meta = m.meta || {};
                const tag = meta.nurture_lifecycle ? `🔔 ${meta.nurture_lifecycle}` :
                  meta.nurture_tier ? `🔔 ${meta.nurture_tier}` :
                  meta.template_name ? `📋 ${meta.template_name}` : null;
                // Extract Meta message id from various meta shapes and look up delivery status
                const metaMsgId = (meta?.meta_send_response?.messages?.[0]?.id) || meta?.meta_message_id;
                const status = (!isIn && metaMsgId) ? statusByMsgId[metaMsgId] : undefined;
                const ind = !isIn ? statusIndicator(status) : null;
                const failed = status === 'failed';
                const bubbleClass = isIn
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : failed
                    ? 'bg-rose-500/10 text-rose-50 border border-rose-500/30'
                    : 'bg-accent-500/10 text-accent-50 border border-accent-500/20';
                return (
                  <div key={i} className={`flex ${isIn ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%]">
                      <div className={`rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed ${bubbleClass}`}>
                        {m.message}
                      </div>
                      <div className={`text-[10px] mt-1 px-1 font-mono flex items-center gap-1.5 ${isIn ? 'text-left justify-start' : 'text-right justify-end'} text-slate-500`}>
                        <span>{new Date(m.created_at).toLocaleString('en-IN')}</span>
                        {tag && <span className="text-slate-400">· {tag}</span>}
                        {ind && (
                          <span className={`${ind.cls} font-semibold`} title={ind.label}>· {ind.icon} {ind.label}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedPhone && <ComposeBox phone={selectedPhone} />}
          </div>
        </div>
      </div>
    </>
  );
}
