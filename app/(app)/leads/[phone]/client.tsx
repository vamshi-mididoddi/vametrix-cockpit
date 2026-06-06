'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { markWon, markLost, reopen, addNote, reassign, setPriority } from './actions';
import { STAGE_META, BRAND_LABEL } from '@/lib/agents';

type Any = any;

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export function LeadDetailClient({
  lead, activities, conversations, owners, ownerName, currentUserId, currentUserRole,
}: {
  lead: Any; activities: Any[]; conversations: Any[]; owners: Any[];
  ownerName: string | null; currentUserId: string; currentUserRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dealValue, setDealValue] = useState<string>('');
  const [wonReason, setWonReason] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [showWonForm, setShowWonForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);

  const isHot = lead.stage === 'hot';
  const isOpen = lead.status === 'open' || !lead.status;
  const isWon = lead.status === 'won';
  const isLost = lead.status === 'lost';
  const isAdmin = currentUserRole === 'admin';
  const isMine = lead.owner_id === currentUserId;
  const stageMeta = STAGE_META[lead.stage || 'new'] || STAGE_META.new;

  function show(msg: string, err = false) {
    setFeedback((err ? '✗ ' : '✓ ') + msg);
    setTimeout(() => setFeedback(null), 5000);
  }

  function doWon() {
    const v = Number(dealValue);
    if (!v || v <= 0) { show('Enter deal value in INR', true); return; }
    startTransition(async () => {
      const r = await markWon(lead.phone, v, wonReason || undefined);
      if (r.ok) { show('Marked WON — Meta CAPI Purchase event fired'); router.refresh(); setShowWonForm(false); }
      else show(r.error || 'failed', true);
    });
  }

  function doLost() {
    if (!lostReason.trim()) { show('Lost reason required', true); return; }
    startTransition(async () => {
      const r = await markLost(lead.phone, lostReason);
      if (r.ok) { show('Marked LOST'); router.refresh(); setShowLostForm(false); }
      else show(r.error || 'failed', true);
    });
  }

  function doReopen() {
    if (!confirm('Reopen this lead?')) return;
    startTransition(async () => {
      const r = await reopen(lead.phone);
      if (r.ok) { show('Reopened'); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function doNote() {
    if (!note.trim()) { show('Note required', true); return; }
    startTransition(async () => {
      const r = await addNote(lead.phone, note);
      if (r.ok) { show('Note added'); setNote(''); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function doReassign(owner_id: string) {
    startTransition(async () => {
      const r = await reassign(lead.phone, owner_id || null);
      if (r.ok) { show('Reassigned'); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function doPriority(p: 'High' | 'Medium' | 'Low') {
    startTransition(async () => {
      const r = await setPriority(lead.phone, p);
      if (r.ok) { show(`Priority → ${p}`); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  return (
    <div className="max-w-[1500px] grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* LEFT: lead summary + actions */}
      <div className="lg:col-span-4 space-y-4">
        <Link href="/leads" className="text-[11px] text-slate-500 hover:text-slate-300">← Pipeline</Link>

        <div className={`bg-bg-card border rounded-lg p-5 ${isHot ? 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'border-bg-border'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-lg font-semibold text-slate-100">{lead.name || '(no name)'}</div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">{lead.phone}</div>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-semibold tabular-nums ${(lead.score || 0) >= 70 ? 'text-accent-400' : (lead.score || 0) >= 40 ? 'text-amber-400' : 'text-slate-500'}`}>
                {lead.score ?? '—'}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">score</div>
            </div>
          </div>

          {isHot && isOpen && (
            <div className="bg-rose-500/15 border border-rose-500/40 rounded-md px-3 py-2 mb-3">
              <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                🔥 HOT LEAD — needs action now
              </div>
            </div>
          )}

          {isWon && (
            <div className="bg-accent-500/15 border border-accent-500/40 rounded-md px-3 py-2 mb-3">
              <div className="text-xs font-semibold text-accent-300">
                ✓ WON · ₹{Number(lead.deal_value_inr || 0).toLocaleString('en-IN')} · {fmt(lead.won_at)}
              </div>
              {lead.won_reason && <div className="text-[11px] text-slate-400 mt-0.5">{lead.won_reason}</div>}
              {lead.capi_purchase_sent ? (
                <div className="text-[10px] text-accent-400 mt-1">✓ Meta CAPI Purchase event fired</div>
              ) : (
                <div className="text-[10px] text-amber-400 mt-1">⏳ CAPI Purchase pending (cron retry every 30 min)</div>
              )}
            </div>
          )}

          {isLost && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-md px-3 py-2 mb-3">
              <div className="text-xs font-semibold text-rose-300">✗ LOST · {fmt(lead.lost_at)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{lead.lost_reason}</div>
            </div>
          )}

          <div className="space-y-1.5 text-xs">
            <Row k="Brand" v={BRAND_LABEL[lead.brand || ''] || lead.brand || '—'} />
            <Row k="Stage" v={<span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-medium ${stageMeta.bg} ${stageMeta.color}`}>{stageMeta.label}</span>} />
            <Row k="Status" v={<span className="text-[10px] uppercase tracking-wider font-mono">{lead.status || 'open'}</span>} />
            <Row k="Priority" v={
              <div className="flex gap-1">
                {(['High','Medium','Low'] as const).map(p => (
                  <button key={p} onClick={() => doPriority(p)} disabled={pending}
                    className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-medium border ${
                      lead.priority === p
                        ? p === 'High' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : p === 'Medium' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-slate-700/30 text-slate-300 border-slate-700'
                        : 'bg-bg-soft text-slate-500 border-bg-border hover:text-slate-300'
                    }`}>{p}</button>
                ))}
              </div>
            } />
            <Row k="Owner" v={
              isAdmin ? (
                <select value={lead.owner_id || ''} onChange={e => doReassign(e.target.value)} disabled={pending}
                  className="text-[11px] bg-bg-soft border border-bg-border rounded px-2 py-0.5">
                  <option value="">unassigned</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name || '(no name)'}</option>)}
                </select>
              ) : <span>{ownerName || 'unassigned'}{isMine && <span className="ml-1 text-accent-400 text-[10px]">(you)</span>}</span>
            } />
            <Row k="Assigned" v={fmt(lead.owner_assigned_at)} />
            <Row k="Created" v={fmt(lead.created_at)} />
            <Row k="Last action" v={fmt(lead.last_action_at)} />
            <Row k="Language" v={lead.language || '—'} />
          </div>
        </div>

        {/* Action buttons */}
        {isOpen && (
          <div className="space-y-2">
            {!showWonForm && !showLostForm && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowWonForm(true)} className="px-3 py-2 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">
                  ✓ Mark WON
                </button>
                <button onClick={() => setShowLostForm(true)} className="px-3 py-2 text-xs rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20">
                  ✗ Mark LOST
                </button>
              </div>
            )}

            {showWonForm && (
              <div className="bg-bg-card border border-accent-500/30 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-accent-300">Mark as WON</div>
                <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)}
                  placeholder="Deal value in INR (required)"
                  className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
                <input value={wonReason} onChange={e => setWonReason(e.target.value)}
                  placeholder="What sealed it? (optional)"
                  className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-xs" />
                <div className="text-[10px] text-slate-500">
                  This fires a Meta CAPI Purchase event with the value and the original ad click ID → closes the ROAS feedback loop.
                </div>
                <div className="flex gap-2">
                  <button onClick={doWon} disabled={pending} className="flex-1 px-3 py-1.5 text-xs rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50">
                    {pending ? 'Closing…' : '✓ Confirm WON + fire CAPI'}
                  </button>
                  <button onClick={() => setShowWonForm(false)} className="px-3 py-1.5 text-xs rounded bg-bg-soft border border-bg-border">Cancel</button>
                </div>
              </div>
            )}

            {showLostForm && (
              <div className="bg-bg-card border border-rose-500/30 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-rose-300">Mark as LOST</div>
                <input value={lostReason} onChange={e => setLostReason(e.target.value)}
                  placeholder="Why did you lose? (required — helps the AI learn)"
                  className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button onClick={doLost} disabled={pending || !lostReason.trim()} className="flex-1 px-3 py-1.5 text-xs rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50">
                    {pending ? 'Closing…' : '✗ Confirm LOST'}
                  </button>
                  <button onClick={() => setShowLostForm(false)} className="px-3 py-1.5 text-xs rounded bg-bg-soft border border-bg-border">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {(isWon || isLost) && (
          <button onClick={doReopen} className="w-full px-3 py-1.5 text-xs rounded bg-bg-soft border border-bg-border hover:border-bg-borderhover">
            ↻ Reopen lead
          </button>
        )}

        <Link href={`/inbox?phone=${encodeURIComponent(lead.phone)}`}
          className="block text-center px-3 py-2 text-xs rounded bg-bg-soft border border-bg-border hover:border-bg-borderhover text-slate-300">
          💬 Open WhatsApp inbox
        </Link>

        {feedback && (
          <div className={`text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>
        )}
      </div>

      {/* RIGHT: timeline + note input + conversation */}
      <div className="lg:col-span-8 space-y-4">
        {/* Add note */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-xs font-semibold mb-2">Log activity / add note</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Called Ravi. Said he'll decide by Monday. Send him pricing PDF."
            className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-500/50" />
          <div className="flex justify-end mt-2">
            <button onClick={doNote} disabled={pending || !note.trim()}
              className="px-4 py-1.5 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? 'Saving…' : '+ Add note'}
            </button>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-xs font-semibold mb-3">Activity timeline ({activities.length})</div>
          {activities.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic">No activity yet.</div>
          ) : (
            <div className="space-y-3">
              {activities.slice().reverse().map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className={`w-1 rounded-full ${actorColor(a.actor_user_id)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-medium">
                        <span className={a.actor_user_id ? 'text-slate-200' : 'text-violet-300'}>{a.actor_label || (a.actor_user_id ? 'Team' : 'AI')}</span>
                        <span className="text-slate-600 mx-1">·</span>
                        <span className="text-slate-500 uppercase tracking-wider text-[9px]">{a.activity_type}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 shrink-0">{fmt(a.created_at)}</div>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5 whitespace-pre-wrap">{a.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last conversation snippets */}
        {conversations.length > 0 && (
          <div className="bg-bg-card border border-bg-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold">Recent WhatsApp ({conversations.length})</div>
              <Link href={`/inbox?phone=${encodeURIComponent(lead.phone)}`} className="text-[10px] text-accent-400 hover:underline">Full chat →</Link>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar">
              {conversations.map(c => (
                <div key={c.id} className={`flex ${c.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-[11px] ${c.direction === 'inbound' ? 'bg-bg-soft text-slate-200' : 'bg-accent-500/15 text-accent-100'}`}>
                    <div className="whitespace-pre-wrap">{c.message}</div>
                    <div className="text-[9px] text-slate-500 mt-1">{fmt(c.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{k}</span>
      <div className="text-xs text-slate-200">{v}</div>
    </div>
  );
}

function actorColor(actor_user_id: string | null): string {
  return actor_user_id ? 'bg-accent-500' : 'bg-violet-500';
}
