'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateLeadStage } from './actions';

const STAGES = ['new', 'engaged', 'qualified', 'hot', 'escalate', 'lost'];

export function StageControl({ phone, currentStage }: { phone: string; currentStage: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null);

  function change(newStage: string) {
    if (newStage === currentStage || pending) return;
    startTransition(async () => {
      const r = await updateLeadStage(phone, newStage);
      if (r.ok) {
        setFlash('ok');
        router.refresh();
      } else {
        setFlash('err');
      }
      setTimeout(() => setFlash(null), 1500);
    });
  }

  return (
    <select
      value={currentStage}
      onChange={e => change(e.target.value)}
      disabled={pending}
      onClick={e => e.stopPropagation()}
      className={`text-[10px] bg-bg-soft border rounded px-1.5 py-0.5 font-mono uppercase ${flash === 'ok' ? 'border-accent-500/50' : flash === 'err' ? 'border-rose-500/50' : 'border-bg-border'} ${pending ? 'opacity-50' : ''}`}
    >
      {STAGES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
    </select>
  );
}
