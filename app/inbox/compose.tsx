'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendHumanMessage } from './actions';

export function ComposeBox({ phone }: { phone: string }) {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function send() {
    if (!text.trim() || !phone) return;
    const toSend = text;
    setFeedback(null);
    startTransition(async () => {
      const r = await sendHumanMessage(phone, toSend);
      if (r.ok) {
        setText('');
        setFeedback('✓ sent');
        router.refresh();
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback('✗ ' + (r.error || 'failed'));
      }
    });
  }

  return (
    <div className="border-t border-bg-border p-3">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Take over and type a reply… (Enter to send)"
          disabled={pending || !phone}
          className="flex-1 bg-bg-soft border border-bg-border rounded-md px-3 py-2 text-sm placeholder:text-slate-600 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={pending || !text.trim() || !phone}
          className="px-4 py-2 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {feedback && (
        <div className={`mt-2 text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>
      )}
      <div className="mt-1.5 text-[10px] text-slate-500">
        ⚠ Sends as free text — requires being inside Meta's 24h customer service window. For older silences, use a template via <span className="underline">/broadcast</span>.
      </div>
    </div>
  );
}
