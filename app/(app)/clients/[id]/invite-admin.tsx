'use client';

import { useState, useTransition } from 'react';
import { inviteClientAdmin } from '../actions';

export function InviteAdmin({ tenantId }: { tenantId: string }) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [result, setResult] = useState<{ email: string; temp: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!email.trim() || pending) return;
    setErr(null); setResult(null);
    startTransition(async () => {
      const res = await inviteClientAdmin(tenantId, email, fullName);
      if (res.ok && res.temp_password) {
        setResult({ email: res.email || email, temp: res.temp_password });
        setEmail(''); setFullName('');
      } else {
        setErr(res.error || 'Failed to invite');
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Admin email *</span>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@client.com" autoComplete="off" className={inp} />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Full name</span>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Client Owner" className={inp} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={submit} disabled={pending || !email.trim()} className="px-4 py-2 text-xs font-semibold rounded-md bg-white text-bg hover:bg-zinc-200 transition disabled:opacity-50">
          {pending ? 'Creating…' : 'Create admin login'}
        </button>
        {err && <span className="text-[11px] text-rose-400">{err}</span>}
      </div>

      {result && (
        <div className="mt-3 bg-accent-500/5 border border-accent-500/30 rounded-md p-4">
          <div className="text-[11px] text-accent-300 font-medium mb-1">Admin login created — share these once, then they reset the password.</div>
          <div className="text-[12px] text-slate-200 font-mono">Email: {result.email}</div>
          <div className="text-[12px] text-slate-200 font-mono">Temp password: {result.temp}</div>
          <div className="text-[10px] text-slate-500 mt-1">They sign in at /login and will only see this client’s data.</div>
        </div>
      )}
    </div>
  );
}

const inp = 'mt-1 w-full bg-bg-soft border border-bg-border rounded-md px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50';
