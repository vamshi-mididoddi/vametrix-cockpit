'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/app/login/actions';

export function UserMenu({ user }: { user: { email: string | null; full_name: string | null; role: string; tenant_name?: string } }) {
  const [open, setOpen] = useState(false);
  const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
  const roleClr = user.role === 'admin' || user.role === 'master_admin'
    ? 'bg-accent-500/15 text-accent-300 border-accent-500/30'
    : 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-xs font-semibold hover:ring-2 hover:ring-accent-500/40 transition shadow"
        title={user.email || ''}
      >
        {initial}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-bg-card border border-bg-border rounded-lg shadow-xl z-20 p-4">
            <div className="flex items-start gap-3 pb-3 border-b border-bg-border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{user.full_name || '(no name)'}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold tracking-wider border ${roleClr}`}>{user.role}</span>
                  {user.tenant_name && (
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono text-slate-400 bg-bg-soft border border-bg-border">
                      {user.tenant_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Link href="/profile" onClick={() => setOpen(false)}
                className="block w-full px-3 py-2 text-xs rounded-md bg-bg-soft text-slate-200 border border-bg-border hover:border-bg-borderhover transition">
                <span className="mr-2">👤</span> Profile & change password
              </Link>
              <Link href="/leads?view=mine" onClick={() => setOpen(false)}
                className="block w-full px-3 py-2 text-xs rounded-md bg-bg-soft text-slate-200 border border-bg-border hover:border-bg-borderhover transition">
                <span className="mr-2">🎯</span> My leads
              </Link>
              <form action={signOut}>
                <button type="submit"
                  className="w-full px-3 py-2 text-xs rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition">
                  Sign out
                </button>
              </form>
            </div>
            <div className="mt-3 pt-3 border-t border-bg-border text-[10px] text-slate-600 text-center font-mono">
              VAMETRIX ENGINE · v1.0
            </div>
          </div>
        </>
      )}
    </div>
  );
}
