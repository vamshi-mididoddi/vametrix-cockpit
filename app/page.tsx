// VAMETRIX Sales — public landing page (new product, 2026-07-07).
import Link from 'next/link';

export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold">V</div>
          <span className="font-semibold tracking-tight">VAMETRIX <span className="text-emerald-400">Sales</span></span>
        </div>
        <Link href="/login" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition">
          Client Login
        </Link>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs mb-6">
          The AI Sales Operating System
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Your entire sales team.<br />
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">One AI. Working 24/7.</span>
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
          The moment a lead arrives — from Meta ads, forms, WhatsApp, or your CRM — VAMETRIX
          takes over: replies in seconds, qualifies, negotiates inside your rules, sends quotes,
          follows up relentlessly, and hands to a human only when it matters.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/login" className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold transition">
            Open your Sales OS
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-5">
        {[
          ['⚡ Instant first touch', 'Every lead gets a personal WhatsApp conversation within seconds of arriving — 24/7, in their language.'],
          ['🎯 Expert qualification', 'The AI asks the right questions naturally, scores every lead against your rules, and never forgets an answer.'],
          ['🤝 Negotiates inside your rules', 'Discount authority and price floors are hard limits — the AI closes deals without ever breaking your pricing.'],
          ['📄 Quotes & meetings, automatically', 'Confirmed interest becomes a quotation or a booked meeting without a human touching a keyboard.'],
          ['🔁 Relentless follow-up', 'Smart cadences, Meta-approved templates the AI writes itself, and re-engagement for cold leads.'],
          ['🧠 Your knowledge, your brand', 'Answers come only from your documents and catalog. Your team edits everything self-serve.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="font-semibold mb-2">{title}</div>
            <div className="text-sm text-zinc-400 leading-relaxed">{body}</div>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500">
        VAMETRIX — the AI Sales Operating System
      </footer>
    </main>
  );
}