'use client';

import { useState } from 'react';
import { signOut } from '@/app/login/actions';

export function UserMenu({ user }: { user: { email: string | null; full_name: string | null; role: string } }) {
  const [open, setOpen] = useState(false);
  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
  const roleClr = user.role === 'admin'
    ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
    : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-semibold hover:ring-2 hover:ring-accent-500/30"
        title={user.email || ''}
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-bg-card border border-bg-border rounded-lg shadow-xl z-20 p-3">
            <div className="text-sm font-medium truncate">{user.full_name || '(no name)'}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider border ${roleClr}`}>{user.role}</span>
              <span className="text-[10px] text-slate-500">role</span>
            </div>
            <form action={signOut} className="mt-3">
              <button type="submit"
                className="w-full px-3 py-1.5 text-xs rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20">
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
