'use client';

import { useState, useTransition } from 'react';
import { PLANS, PLAN_TIERS, type PlanTier } from '@/lib/billing';
import { createClient } from './actions';

export function AddClient() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [plan, setPlan] = useState<PlanTier>('starter');

  function reset() {
    setName(''); setContactName(''); setContactEmail(''); setWhatsappNumber(''); setPlan('starter');
  }

  function submit() {
    if (!name.trim() || pending) return;
    setMsg(null);
    startTransition(async () => {
      const res = await createClient({ name, contactName, contactEmail, whatsappNumber, plan });
      if (res.ok) {
        setMsg({ kind: 'ok', text: `Client created (${res.slug}).` });
        reset();
        setOpen(false);
      } else {
        setMsg({ kind: 'err', text: res.error || 'Failed to create client' });
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 transition"
        >
          {open ? 'Cancel' : '+ Add client'}
        </button>
        {msg && (
          <span className={`text-[11px] ${msg.kind === 'ok' ? 'text-accent-400' : 'text-rose-400'}`}>{msg.text}</span>
        )}
      </div>

      {open && (
        <div className="mt-3 bg-bg-card border border-bg-border rounded-lg p-5 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Company name *">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Exports" className={inputCls} />
            </Field>
            <Field label="Primary contact">
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ravi Kumar" className={inputCls} />
            </Field>
            <Field label="Contact email">
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="ravi@acme.com" className={inputCls} />
            </Field>
            <Field label="WhatsApp number">
              <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+91 98xxxxxxx" className={inputCls} />
            </Field>
            <Field label="Plan">
              <select value={plan} onChange={e => setPlan(e.target.value as PlanTier)} className={inputCls}>
                {PLAN_TIERS.map(t => <option key={t} value={t}>{PLANS[t].label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={submit}
              disabled={pending || !name.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-white text-bg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {pending ? 'Creating…' : 'Create client'}
            </button>
            <span className="text-[10px] text-slate-500">Creates a new tenant. Connect their Meta/WhatsApp credentials after.</span>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-bg-soft border border-bg-border rounded-md px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
