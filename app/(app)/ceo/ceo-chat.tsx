'use client';

import { useState, useRef, useEffect } from 'react';
import { ceoChat, approveCeoAction } from './chat-actions';

type Msg = { role: 'user' | 'assistant'; content: string; proposals?: Proposal[]; done?: Record<string, string> };
type Proposal = { id: string; action: string; args: Record<string, any>; label: string; reason: string };

const SUGGESTIONS = [
  'How are my campaigns doing this month?',
  'What is wasting money? Propose what to pause.',
  'Why is my Rice CPL high?',
  'Show me my lead pipeline.',
  'Is anything in the engine broken?',
];

// minimal markdown: **bold**, line breaks, simple tables left as text
function render(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <strong key={i} className="text-zinc-100">{p.slice(2, -2)}</strong>
    : <span key={i}>{p}</span>);
}

export function CeoChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: 'user', content: t }]);
    setBusy(true);
    try {
      const r = await ceoChat(history as any, t);
      if (r.ok) setMsgs(m => [...m, { role: 'assistant', content: r.reply || '(no reply)', proposals: r.proposals || [] }]);
      else setMsgs(m => [...m, { role: 'assistant', content: `⚠️ ${r.error}` }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: `⚠️ ${String(e?.message || e)}` }]);
    } finally { setBusy(false); }
  }

  async function approve(mi: number, p: Proposal) {
    if (!confirm(`Approve: ${p.label}?\n\n${p.reason}`)) return;
    setActing(p.id);
    try {
      const r = await approveCeoAction(p.action, p.args as any);
      setMsgs(m => m.map((msg, i) => i === mi ? { ...msg, done: { ...(msg.done || {}), [p.id]: r.ok ? '✓ Done' : `✗ ${r.detail}` } } : msg));
      if (r.ok) {
        // let the CEO acknowledge + suggest next
        send(`I approved: ${p.label}. It's done. What's next?`);
      }
    } finally { setActing(null); }
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl flex flex-col h-[620px] max-h-[78vh]">
      {/* header */}
      <div className="px-4 py-3 border-b border-bg-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-sm font-bold shrink-0">V</div>
        <div>
          <div className="text-sm font-semibold">Vametrix CEO</div>
          <div className="text-[10px] text-zinc-500">Talk to your engine — it audits, launches, pauses, reports. Spend actions need your approval.</div>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-accent-400"><span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />online</span>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-4">
        {msgs.length === 0 && (
          <div className="text-center mt-6">
            <div className="text-sm text-zinc-400 mb-3">Ask me anything about your sales + marketing engine.</div>
            <div className="flex flex-col gap-1.5 max-w-md mx-auto">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-left text-[12px] px-3 py-2 rounded-lg bg-bg-soft border border-bg-border hover:border-accent-500/40 hover:text-accent-300 text-zinc-300 transition">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-accent-500/15 border border-accent-500/30' : 'bg-bg-soft border border-bg-border'} rounded-2xl px-4 py-2.5`}>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-200">{render(m.content)}</div>
              {/* proposals */}
              {m.proposals && m.proposals.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.proposals.map(p => {
                    const status = m.done?.[p.id];
                    return (
                      <div key={p.id} className="bg-amber-500/8 border border-amber-500/30 rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[12px] font-medium text-amber-200 capitalize">{p.label}</div>
                          {status ? <span className={`text-[11px] ${status.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{status}</span>
                            : <button onClick={() => approve(i, p)} disabled={acting === p.id} className="px-2.5 py-1 text-[11px] rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50 shrink-0">{acting === p.id ? '…' : 'Approve & run'}</button>}
                        </div>
                        {p.reason && <div className="text-[11px] text-zinc-400 mt-1">{p.reason}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start"><div className="bg-bg-soft border border-bg-border rounded-2xl px-4 py-2.5 text-[13px] text-zinc-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" /> CEO is working…</div></div>
        )}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div className="border-t border-bg-border p-3">
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} disabled={busy}
            placeholder="Ask Vametrix CEO… (e.g. 'pause anything wasting money')"
            className="flex-1 bg-bg-soft border border-bg-border rounded-lg px-3 py-2.5 text-[13px] placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/50" />
          <button type="submit" disabled={busy || !input.trim()} className="px-4 py-2.5 text-sm rounded-lg bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-40 font-medium">Send</button>
        </form>
      </div>
    </div>
  );
}
