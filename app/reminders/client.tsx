'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { scheduleReminder, cancelReminder } from './actions';

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sent:      'bg-accent-500/15 text-accent-400 border-accent-500/30',
  cancelled: 'bg-slate-700/30 text-slate-500 border-slate-700',
  expired:   'bg-slate-700/30 text-slate-500 border-slate-700',
  failed:    'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const KINDS = ['callback', 'demo', 'followup', 'custom'];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}
function inFuture(iso: string) { return new Date(iso).getTime() > Date.now(); }
function relTime(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const mins = Math.round(ms / 60000);
  if (Math.abs(mins) < 60) return mins > 0 ? `in ${mins}m` : `${-mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 48) return hrs > 0 ? `in ${hrs}h` : `${-hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days > 0 ? `in ${days}d` : `${-days}d ago`;
}

export function RemindersClient({ initialReminders }: { initialReminders: any[] }) {
  const [reminders, setReminders] = useState(initialReminders);
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState('callback');
  const [whenLocal, setWhenLocal] = useState('');
  const [hint, setHint] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    if (!phone || !whenLocal) { setFeedback('phone and when required'); return; }
    const iso = new Date(whenLocal).toISOString();
    setFeedback(null);
    startTransition(async () => {
      const r = await scheduleReminder({ phone, scheduled_at: iso, kind, message_hint: hint });
      if (r.ok) {
        setFeedback('✓ scheduled');
        setPhone(''); setWhenLocal(''); setHint('');
        router.refresh();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback('✗ ' + (r.error || 'failed'));
      }
    });
  }

  function cancel(id: number) {
    startTransition(async () => {
      const r = await cancelReminder(id);
      if (r.ok) {
        setReminders(prev => prev.map(x => x.id === id ? { ...x, status: 'cancelled' } : x));
        router.refresh();
      }
    });
  }

  const upcoming = reminders.filter(r => r.status === 'pending').sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = reminders.filter(r => r.status !== 'pending').sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  return (
    <div className="grid grid-cols-12 gap-6 max-w-6xl">
      <div className="col-span-12 lg:col-span-5 space-y-4">
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">Schedule a reminder</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400">Phone (with country code)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX"
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Kind</label>
                <select value={kind} onChange={e => setKind(e.target.value)}
                  className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
                  {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">When</label>
                <input type="datetime-local" value={whenLocal} onChange={e => setWhenLocal(e.target.value)}
                  className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Message hint (LLM uses this to generate the reminder)</label>
              <textarea value={hint} onChange={e => setHint(e.target.value)} rows={3}
                placeholder='e.g. "Reminding about the Dcal quote you asked for at 4pm yesterday"'
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
            </div>
            <button onClick={submit} disabled={pending || !phone || !whenLocal}
              className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? 'Scheduling…' : 'Schedule'}
            </button>
            {feedback && <div className={`text-xs ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>}
          </div>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-lg p-4 text-xs text-slate-400">
          <div className="text-slate-300 font-medium mb-2">How reminders work</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><span className="font-mono text-accent-400">[VAMETRIX] 43</span> cron runs every 5 min.</li>
            <li>For each pending reminder due ≤ now, calls Gemini Flash with your hint.</li>
            <li>Sends the generated message via Meta WA + logs to <span className="font-mono">conversations</span>.</li>
            <li>Marks reminder as <span className="font-mono">sent</span>.</li>
            <li>Useful for: callbacks, demos, follow-ups, missed events.</li>
          </ul>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-7 space-y-4">
        <div>
          <div className="flex items-end justify-between mb-2">
            <h3 className="text-sm font-semibold">Upcoming ({upcoming.length})</h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-bg-card border border-bg-border rounded-lg p-6 text-center text-sm text-slate-500 italic">No upcoming reminders.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(r => {
                const cls = STATUS_COLOR[r.status] || STATUS_COLOR.pending;
                return (
                  <div key={r.id} className="bg-bg-card border border-bg-border rounded-lg p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-slate-200">{r.phone}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{r.kind}</span>
                        <span className={`stage-badge border ${cls}`}>{r.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {fmtTime(r.scheduled_at)} <span className="text-slate-600">· {relTime(r.scheduled_at)}</span>
                      </div>
                      {r.message_hint && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{r.message_hint}</div>}
                    </div>
                    <button onClick={() => cancel(r.id)} disabled={pending}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-700/30 text-slate-300 border border-slate-700 hover:bg-slate-700/50">Cancel</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-400">Past ({past.length})</h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar">
              {past.map(r => {
                const cls = STATUS_COLOR[r.status] || STATUS_COLOR.expired;
                return (
                  <div key={r.id} className="bg-bg-card border border-bg-border rounded-lg p-3 opacity-70">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-200">{r.phone}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{r.kind}</span>
                      <span className={`stage-badge border ${cls}`}>{r.status}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">{fmtTime(r.scheduled_at)}</span>
                    </div>
                    {r.message_hint && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{r.message_hint}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
