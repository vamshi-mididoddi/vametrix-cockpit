'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserRole, inviteUser, deleteUser } from './actions';

type U = {
  id: string;
  role: 'admin' | 'team';
  full_name: string | null;
  email: string;
  created_at: string;
  last_sign_in: string;
};

function fmt(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export function TeamClient({ initialUsers }: { initialUsers: U[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'team'>('team');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function changeRole(id: string, role: 'admin' | 'team') {
    startTransition(async () => {
      const r = await updateUserRole(id, role);
      if (r.ok) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
        router.refresh();
      } else {
        alert('Failed: ' + r.error);
      }
    });
  }

  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(null);

  function doInvite() {
    if (!inviteEmail) { setFeedback('email required'); return; }
    setFeedback(null);
    setCreatedAccount(null);
    startTransition(async () => {
      const r = await inviteUser(inviteEmail, inviteName, inviteRole);
      if (r.ok && r.temp_password) {
        setFeedback(null);
        setCreatedAccount({ email: r.email!, password: r.temp_password });
        setInviteEmail(''); setInviteName('');
        router.refresh();
      } else {
        setFeedback('✗ ' + (r.error || 'failed'));
      }
    });
  }

  function copyCredentials() {
    if (!createdAccount) return;
    const text = `Vametrix Engine — login at vametrix-cockpit.vercel.app/login\nEmail: ${createdAccount.email}\nTemp password: ${createdAccount.password}\n\nChange your password after first sign-in at /profile.`;
    navigator.clipboard.writeText(text);
  }

  function doDelete(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This is permanent.`)) return;
    startTransition(async () => {
      const r = await deleteUser(id);
      if (r.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        router.refresh();
      } else {
        alert('Failed: ' + r.error);
      }
    });
  }

  const adminCount = users.filter(u => u.role === 'admin').length;
  const teamCount = users.filter(u => u.role === 'team').length;

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Kpi label="Total users" value={String(users.length)} />
        <Kpi label="Admins" value={String(adminCount)} accent />
        <Kpi label="Team" value={String(teamCount)} />
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Users</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Add team members by sending them an email invite. Change roles inline.</p>
        </div>
        <button onClick={() => setShowInvite(s => !s)}
          className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">
          {showInvite ? '✕ Close' : '+ Invite team member'}
        </button>
      </div>

      {showInvite && (
        <div className="bg-bg-card border border-bg-border rounded-lg p-5 mb-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] uppercase text-slate-500 tracking-wider">Email</label>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="teammate@befach.com"
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 tracking-wider">Full name</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Optional"
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 tracking-wider">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
                <option value="team">team</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={doInvite} disabled={pending || !inviteEmail}
              className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
              {pending ? 'Creating…' : 'Create account'}
            </button>
            {feedback && <span className={`text-xs ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</span>}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Creates the account instantly with a temp password (no email needed). Share the password with them via WhatsApp/Slack — they change it on first sign-in.
          </div>

          {createdAccount && (
            <div className="mt-4 bg-accent-500/10 border border-accent-500/30 rounded-lg p-4 space-y-2">
              <div className="text-xs font-semibold text-accent-300">✓ Account created — share these with {createdAccount.email}</div>
              <div className="bg-bg-soft border border-bg-border rounded p-3 font-mono text-xs space-y-1">
                <div><span className="text-slate-500">URL:</span> <span className="text-slate-200">vametrix-cockpit.vercel.app/login</span></div>
                <div><span className="text-slate-500">Email:</span> <span className="text-slate-200">{createdAccount.email}</span></div>
                <div><span className="text-slate-500">Password:</span> <span className="text-accent-300 select-all">{createdAccount.password}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyCredentials} className="px-3 py-1.5 text-[11px] rounded bg-bg-soft border border-bg-border hover:border-bg-borderhover">
                  📋 Copy all
                </button>
                <button onClick={() => setCreatedAccount(null)} className="px-3 py-1.5 text-[11px] rounded bg-bg-soft border border-bg-border hover:border-bg-borderhover text-slate-400">
                  ✕ Dismiss
                </button>
                <span className="text-[10px] text-amber-300 ml-2">⚠ This password is shown ONCE — copy it now.</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-soft border-b border-bg-border">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Role</th>
              <th className="text-left py-2 px-3">Joined</th>
              <th className="text-left py-2 px-3">Last sign in</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500 text-sm">No users yet.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-bg-border hover:bg-bg-cardhover">
                <td className="py-2 px-3 text-xs">{u.full_name || '(no name)'}</td>
                <td className="py-2 px-3 text-[11px] font-mono text-slate-300">{u.email}</td>
                <td className="py-2 px-3">
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value as any)}
                    disabled={pending}
                    className={`text-[10px] bg-bg-soft border rounded px-2 py-0.5 font-mono uppercase ${u.role === 'admin' ? 'border-accent-500/30 text-accent-300' : 'border-bg-border text-slate-300'}`}>
                    <option value="admin">admin</option>
                    <option value="team">team</option>
                  </select>
                </td>
                <td className="py-2 px-3 text-[11px] text-slate-500">{fmt(u.created_at)}</td>
                <td className="py-2 px-3 text-[11px] text-slate-500">{fmt(u.last_sign_in)}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => doDelete(u.id, u.email)} disabled={pending}
                    className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
        ⚠ Admin role = full cockpit access (cost, settings, audit, agent #8 decisions, etc.). Team role = daily operations only (inbox, leads, broadcasts, reminders).
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grad-card border border-bg-border rounded-lg p-3">
      <div className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accent ? 'text-accent-400' : ''}`}>{value}</div>
    </div>
  );
}
