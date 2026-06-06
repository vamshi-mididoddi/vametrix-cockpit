'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword, updateFullName } from './actions';

export function ProfileClient({ user }: { user: { id: string; email: string | null; full_name: string | null; role: string } }) {
  const [name, setName] = useState(user.full_name || '');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pending, startTransition] = useTransition();
  const [nameFb, setNameFb] = useState<string | null>(null);
  const [pwFb, setPwFb] = useState<string | null>(null);
  const router = useRouter();

  function saveName() {
    if (!name) { setNameFb('name required'); return; }
    setNameFb(null);
    startTransition(async () => {
      const r = await updateFullName(name);
      if (r.ok) {
        setNameFb('✓ saved');
        router.refresh();
        setTimeout(() => setNameFb(null), 3000);
      } else {
        setNameFb('✗ ' + (r.error || 'failed'));
      }
    });
  }

  function savePw() {
    if (pw1 !== pw2) { setPwFb('passwords don\'t match'); return; }
    if (pw1.length < 8) { setPwFb('at least 8 characters'); return; }
    setPwFb(null);
    startTransition(async () => {
      const r = await updatePassword(pw1);
      if (r.ok) {
        setPwFb('✓ password updated');
        setPw1(''); setPw2('');
        setTimeout(() => setPwFb(null), 3000);
      } else {
        setPwFb('✗ ' + (r.error || 'failed'));
      }
    });
  }

  const roleBadge = user.role === 'admin'
    ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
    : 'bg-sky-500/15 text-sky-300 border-sky-500/30';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-bg-card border border-bg-border rounded-lg p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-lg font-semibold shrink-0">
            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold">{user.full_name || '(no name)'}</div>
            <div className="text-xs text-slate-500 font-mono">{user.email}</div>
            <div className="mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider border ${roleBadge}`}>{user.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3">Display name</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={saveName} disabled={pending || !name}
            className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
            Save
          </button>
        </div>
        {nameFb && <div className={`mt-2 text-xs ${nameFb.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{nameFb}</div>}
      </div>

      <div className="bg-bg-card border border-bg-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-3">Change password</h3>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400">New password</label>
            <input type="password" value={pw1} onChange={e => setPw1(e.target.value)}
              className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" placeholder="•••••••• (min 8 chars)" />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Confirm new password</label>
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') savePw(); }}
              className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" placeholder="••••••••" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={savePw} disabled={pending || !pw1 || !pw2}
              className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? 'Updating…' : 'Update password'}
            </button>
            {pwFb && <span className={`text-xs ${pwFb.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{pwFb}</span>}
          </div>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-xs text-amber-200">
          ⚠ You are an <strong>admin</strong> with full cockpit access — financial data, engine config, agent decisions, audit log, team management. Manage other users at <a href="/team" className="underline">/team</a>.
        </div>
      )}
    </div>
  );
}
