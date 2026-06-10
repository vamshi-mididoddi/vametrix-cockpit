'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const GREETING: Msg = {
  role: 'assistant',
  content: "Hey 👋 I'm Vametrix — the AI that runs sales & marketing for businesses. Ask me anything, or tell me what you're working on and I'll show you what the engine would do.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let s = '';
    try { s = localStorage.getItem('vmx_chat_sid') || ''; } catch {}
    if (!s) { s = 'web-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); try { localStorage.setItem('vmx_chat_sid', s); } catch {} }
    setSessionId(s);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200); }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => m.role !== 'assistant' || m !== GREETING), sessionId }),
      });
      const j = await r.json();
      setMessages((m) => [...m, { role: 'assistant', content: j.reply || "Sorry, I didn't catch that — try again?" }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Connection hiccup — please try once more.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat with Vametrix"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-accent-500 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-accent-500/30 transition hover:scale-105 hover:bg-accent-400"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <span>Chat with Vametrix</span>
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[70vh] max-h-[560px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-bg-border bg-bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-bg-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-black">V</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-100">Vametrix AI</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Online · replies instantly</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-accent-500/15 text-accent-50 border border-accent-500/20' : 'bg-slate-800 text-slate-100 border border-slate-700'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-bg-border p-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask Vametrix anything…"
                className="flex-1 rounded-xl border border-bg-border bg-bg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-accent-500/50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-black transition hover:bg-accent-400 disabled:opacity-40"
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
              </button>
            </div>
            <div className="mt-1.5 text-center text-[10px] text-slate-600">Powered by the Vametrix Engine</div>
          </div>
        </div>
      )}
    </>
  );
}
