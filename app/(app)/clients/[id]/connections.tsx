'use client';

import { useState, useTransition } from 'react';
import { SERVICE_CATALOG, type ConnService } from '@/lib/connections';
import { setServiceCredentials } from '../actions';

export function Connections({
  tenantId,
  connected,
  nonSecret,
}: {
  tenantId: string;
  connected: Record<string, boolean>;       // service → has any credential
  nonSecret: Record<string, Record<string, string>>; // service → {key: value} for non-secret fields
}) {
  return (
    <div className="space-y-3">
      {SERVICE_CATALOG.map((svc) => (
        <ServiceCard
          key={svc.service}
          tenantId={tenantId}
          svc={svc}
          isConnected={!!connected[svc.service]}
          prefill={nonSecret[svc.service] || {}}
        />
      ))}
    </div>
  );
}

function ServiceCard({ tenantId, svc, isConnected, prefill }: { tenantId: string; svc: ConnService; isConnected: boolean; prefill: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...prefill }));

  function save() {
    if (pending) return;
    setMsg(null);
    startTransition(async () => {
      const res = await setServiceCredentials(tenantId, svc.service, values);
      if (res.ok) {
        setMsg({ kind: 'ok', text: res.saved ? `Saved ${res.saved} field(s).` : 'Nothing to save.' });
        // clear secret inputs after save
        setValues(v => {
          const next = { ...v };
          for (const f of svc.fields) if (f.secret) next[f.key] = '';
          return next;
        });
      } else {
        setMsg({ kind: 'err', text: res.error || 'Save failed' });
      }
    });
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-accent-500' : 'bg-slate-600'}`} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-slate-100 flex items-center gap-2">
              {svc.label}
              {svc.required && <span className="text-[9px] uppercase tracking-wider text-slate-500">required</span>}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{svc.blurb}</div>
          </div>
        </div>
        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border shrink-0 ${
          isConnected ? 'bg-accent-500/10 text-accent-300 border-accent-500/30' : 'bg-slate-700/30 text-slate-400 border-slate-700'
        }`}>
          {isConnected ? 'Connected' : 'Not set'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-bg-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {svc.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {f.label}{f.secret && <span className="ml-1 text-slate-600">· hidden</span>}
                </span>
                <input
                  type={f.secret ? 'password' : 'text'}
                  value={values[f.key] || ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.secret && isConnected ? '•••••• (leave blank to keep)' : (f.placeholder || '')}
                  autoComplete="off"
                  className="mt-1 w-full bg-bg-soft border border-bg-border rounded-md px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50 font-mono"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={pending} className="px-4 py-2 text-xs font-semibold rounded-md bg-white text-bg hover:bg-zinc-200 transition disabled:opacity-50">
              {pending ? 'Saving…' : 'Save connection'}
            </button>
            {msg && <span className={`text-[11px] ${msg.kind === 'ok' ? 'text-accent-400' : 'text-rose-400'}`}>{msg.text}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
