'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from './actions';

export function LoginForm({ nextPath, initialError }: { nextPath: string; initialError?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError || null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      if (mode === 'signin') {
        const r = await signIn(email, password, nextPath);
        if (r.ok) {
          // Server determined the smart redirect (team → /leads?view=mine, admin → /)
          const target = r.redirect_to || nextPath || '/';
          router.push(target);
          router.refresh();
        } else {
          setError(r.error || 'sign-in failed');
        }
      } else {
        const r = await signUp(email, password, fullName);
        if (r.ok) {
          setInfo('Account created. Sign in below to continue.');
          setMode('signin');
        } else {
          setError(r.error || 'sign-up failed');
        }
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition ${mode === 'signin' ? 'bg-accent-500/15 text-accent-300 border border-accent-500/30' : 'bg-bg-soft text-slate-400 border border-bg-border hover:text-slate-300'}`}
        >Sign in</button>
        <button
          onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md transition ${mode === 'signup' ? 'bg-accent-500/15 text-accent-300 border border-accent-500/30' : 'bg-bg-soft text-slate-400 border border-bg-border hover:text-slate-300'}`}
        >First time?</button>
      </div>
      <div className="space-y-3">
        {mode === 'signup' && (
          <div>
            <label className="text-[11px] text-slate-400">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
              className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" autoFocus />
          </div>
        )}
        <div>
          <label className="text-[11px] text-slate-400">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@befach.com"
            autoFocus={mode === 'signin'}
            className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent-500/50" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="••••••••"
            className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-500/50" />
        </div>
        {error && (
          <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2 flex items-start gap-2">
            <span>✗</span> <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="text-[11px] text-accent-300 bg-accent-500/10 border border-accent-500/30 rounded px-3 py-2 flex items-start gap-2">
            <span>✓</span> <span>{info}</span>
          </div>
        )}
        <button onClick={submit} disabled={pending || !email || !password}
          className="w-full px-4 py-2.5 text-sm font-medium rounded-md bg-accent-500/20 text-accent-200 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition">
          {pending ? 'Signing in…' : mode === 'signin' ? 'Sign in →' : 'Create account'}
        </button>
      </div>
    </div>
  );
}
