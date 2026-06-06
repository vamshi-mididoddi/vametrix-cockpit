import Link from 'next/link';
import { ArrowRight, Target, Zap, BarChart3, CircleCheck, TrendingUp, Eye, MessageSquare, ChevronRight } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-dark text-zinc-200 overflow-x-hidden font-sans">
      <NavBar />
      <Hero />
      <PillarsSection />
      <HowWeScale />
      <StackSection />
      <ProofSection />
      <ROICalc />
      <CTASection />
      <Footer />
    </div>
  );
}

// ─────────────── NAV ───────────────
function NavBar() {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center text-white font-bold text-sm shadow-lg neon-border-purple ring-1 ring-white/10">V</div>
          <div className="font-bold tracking-tight text-base">vametrix</div>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
          <a href="#pillars" className="hover:text-white transition">Services</a>
          <a href="#scale" className="hover:text-white transition">How we work</a>
          <a href="#stack" className="hover:text-white transition">Our stack</a>
          <a href="#proof" className="hover:text-white transition">Case studies</a>
          <a href="#roi" className="hover:text-white transition">ROI calculator</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-zinc-300 hover:text-white px-3 py-2 rounded-md font-medium transition">
            Sign in
          </Link>
          <a href="#contact" className="text-sm font-semibold px-4 py-2 rounded-md bg-gradient-to-r from-brand-purple to-brand-cyan text-white hover:opacity-90 transition shadow-lg neon-border-purple">
            Start growth chat →
          </a>
        </div>
      </div>
    </header>
  );
}

// ─────────────── HERO ───────────────
function Hero() {
  return (
    <section className="relative pt-24 pb-32 px-6 overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 brand-grid brand-grid-fade opacity-50 pointer-events-none" />
      {/* Brand glows */}
      <div className="absolute top-20 -left-32 w-[600px] h-[600px] bg-brand-purple/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-32 -right-32 w-[600px] h-[600px] bg-brand-cyan/12 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel mb-8 text-xs text-zinc-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-brand-glow neon-text-cyan" />
          <span>Premium growth systems · Hyderabad</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-fade-in">
          <span className="text-white">We Don't Just Run Ads.</span>
          <br/>
          <span className="gradient-text-brand neon-text-purple">We Engineer Revenue.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          Premium growth systems for businesses that demand high ROI. Stop burning cash
          on vanity metrics. <span className="text-zinc-200 font-medium">Engineering revenue through data-driven precision.</span>
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="#contact" className="group px-7 py-3.5 rounded-md bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-semibold text-base hover:opacity-95 transition flex items-center gap-2 shadow-2xl neon-border-purple">
            Book a Strategy Audit
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" strokeWidth={2.5} />
          </a>
          <a href="#proof" className="px-7 py-3.5 rounded-md glass-panel hover:bg-white/5 font-medium text-base transition text-zinc-200 flex items-center gap-2">
            See proof of performance
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </a>
        </div>

        {/* Stat strip */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <Stat value="2.1x → 6.2x" label="Avg ROAS lift" tint="cyan" />
          <Stat value="340%" label="Demo request growth" tint="purple" />
          <Stat value="35%" label="Avg efficiency increase" tint="cyan" />
          <Stat value="4x" label="Testing velocity vs industry" tint="purple" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, tint }: { value: string; label: string; tint: 'cyan' | 'purple' }) {
  const color = tint === 'cyan' ? 'gradient-text-brand neon-text-cyan' : 'gradient-text-brand neon-text-purple';
  return (
    <div className="glass-panel rounded-xl p-5 text-center">
      <div className={`text-2xl md:text-3xl font-bold tracking-tight mb-1 ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">{label}</div>
    </div>
  );
}

// ─────────────── PILLARS ───────────────
function PillarsSection() {
  const pillars = [
    {
      icon: <Target className="w-6 h-6" strokeWidth={1.75} />,
      tag: '01',
      title: 'Paid Acquisition',
      desc: 'High-intent traffic via Google & Meta Ads. Laser-targeted audiences. We don\'t care about "Likes" — we care about Qualified Leads and Revenue.',
      tint: 'cyan' as const,
    },
    {
      icon: <Zap className="w-6 h-6" strokeWidth={1.75} />,
      tag: '02',
      title: 'Conversion Engineering',
      desc: 'Landing page optimization and CRO to turn clicks into cash. We fix your conversion leaks before we spend a dollar on ads.',
      tint: 'purple' as const,
    },
    {
      icon: <BarChart3 className="w-6 h-6" strokeWidth={1.75} />,
      tag: '03',
      title: 'Analytics Infrastructure',
      desc: 'Server-side tracking. Crystal-clear attribution. No more dark data. Know exactly which channel, ad, and audience is driving revenue.',
      tint: 'cyan' as const,
    },
  ];

  return (
    <section id="pillars" className="py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-cyan mb-3 font-mono">— Our Architecture</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
            We don't offer 50 services.
            <br/>
            <span className="gradient-text-brand">3 pillars of growth — mastered.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map(p => (
            <div key={p.tag} className="glass-panel rounded-2xl p-7 hover:bg-white/5 transition group">
              <div className="flex items-start justify-between mb-5">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${p.tint === 'cyan' ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan' : 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple'}`}>
                  {p.icon}
                </div>
                <span className="text-3xl font-mono font-bold text-white/10 group-hover:text-white/20 transition">{p.tag}</span>
              </div>
              <h3 className={`text-xl font-bold mb-3 tracking-tight ${p.tint === 'cyan' ? 'neon-text-cyan' : 'neon-text-purple'}`}>{p.title}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── HOW WE SCALE ───────────────
function HowWeScale() {
  return (
    <section id="scale" className="py-24 px-6 border-y border-white/5 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-purple mb-3 font-mono">— How we scale you</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">From audit to engine — in 30 days.</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            We usually start with an audit to tell you exactly where your funnel is leaking. Then we engineer it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Step
            num="01"
            title="Full-Funnel Audit"
            desc="We map every step of your funnel. Identify exactly where conversion is leaking — landing page, ads, tracking, follow-up."
            theProblem="The Problem: Most agencies optimize ONE channel. We diagnose the whole machine."
          />
          <Step
            num="02"
            title="Conversion Engineering"
            desc="Before spending a dollar on traffic, we fix your conversion leaks. New landing pages, A/B tests, server-side tracking."
            theProblem="Our Strategy: 4x the industry's testing velocity. Rapid iteration."
          />
          <Step
            num="03"
            title="Scale with Precision"
            desc="Paid acquisition turned on. Real-time dashboards. Weekly strategy reviews. We engineer revenue, not vanity metrics."
            theProblem="The Result: 2.1x → 6.2x ROAS in 90 days. From dark data to crystal-clear attribution."
          />
        </div>
      </div>
    </section>
  );
}

function Step({ num, title, desc, theProblem }: { num: string; title: string; desc: string; theProblem: string }) {
  return (
    <div className="glass-panel rounded-2xl p-7 relative overflow-hidden group hover:bg-white/5 transition">
      <div className="text-6xl font-bold font-mono text-white/5 absolute top-3 right-5">{num}</div>
      <div className="relative">
        <div className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">STEP {num}</div>
        <h3 className="text-xl font-bold mb-3 tracking-tight">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5">{desc}</p>
        <div className="text-xs text-zinc-500 italic font-mono leading-relaxed border-l-2 border-brand-purple/40 pl-3">{theProblem}</div>
      </div>
    </div>
  );
}

// ─────────────── STACK ───────────────
function StackSection() {
  const tools = [
    { name: 'Meta Ads',          tag: 'Acquisition'  },
    { name: 'Google Ads',        tag: 'Acquisition'  },
    { name: 'GTM',               tag: 'Tracking'     },
    { name: 'GA4',               tag: 'Analytics'    },
    { name: 'Meta CAPI',         tag: 'Server-side'  },
    { name: 'Microsoft Clarity', tag: 'UX'           },
    { name: 'Supabase',          tag: 'Data'         },
    { name: 'WhatsApp Cloud API',tag: 'CRM'          },
    { name: 'OpenRouter LLMs',   tag: 'AI'           },
    { name: 'n8n',               tag: 'Automation'   },
    { name: 'Vercel',            tag: 'Hosting'      },
    { name: 'Telegram',          tag: 'Ops'          },
  ];
  return (
    <section id="stack" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-cyan mb-3 font-mono">— Our stack</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built on a serious stack.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tools.map(t => (
            <div key={t.name} className="glass-panel rounded-lg px-4 py-4 text-center hover:border-brand-cyan/40 hover:bg-white/5 transition">
              <div className="text-sm font-semibold text-zinc-200 tracking-tight">{t.name}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mt-1">{t.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── PROOF / CASE STUDIES ───────────────
function ProofSection() {
  const cases = [
    { client: 'TechFlow Inc.',         metric: 'From 2.1x to 6.2x',  label: 'ROAS in 90 days',         desc: 'B2B SaaS — fixed attribution + scaled Meta + Google.' },
    { client: 'Aadwik Tax Solutions',  metric: '340%',                label: 'Demo request growth',    desc: 'Tax services — funnel rebuild + paid acquisition system.' },
    { client: 'RKS Interiors',         metric: '4.2x',                label: 'Pipeline value lift',    desc: 'Premium interiors — high-intent traffic + lead qualifier.' },
    { client: 'Sice Educations',       metric: '₹2.4Cr',              label: 'Attributable revenue',   desc: 'Edtech — Crystal-clear server-side tracking unlocked spend confidence.' },
  ];
  return (
    <section id="proof" className="py-24 px-6 border-y border-white/5 bg-white/[0.015]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-purple mb-3 font-mono">— Proof of performance</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">Real numbers from real campaigns.</h2>
          <p className="text-zinc-400 text-lg">
            No vanity metrics. Just revenue acceleration.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cases.map(c => (
            <div key={c.client} className="glass-panel rounded-2xl p-7 hover:bg-white/5 transition group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono">{c.client}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30 font-mono uppercase tracking-wider">Verified</span>
              </div>
              <div className="text-4xl md:text-5xl font-bold gradient-text-brand neon-text-cyan tracking-tight mb-1">{c.metric}</div>
              <div className="text-sm text-zinc-300 mb-3">{c.label}</div>
              <p className="text-sm text-zinc-500 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="#contact" className="text-sm text-brand-cyan hover:underline font-mono">See detailed breakdowns on WhatsApp →</a>
        </div>
      </div>
    </section>
  );
}

// ─────────────── ROI CALCULATOR (CTA-style) ───────────────
function ROICalc() {
  return (
    <section id="roi" className="py-24 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-purple/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-brand-cyan mb-3 font-mono">— Lost revenue calculator</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">How much revenue are you leaving on the table?</h2>
          <p className="text-zinc-400 text-lg">
            Punch in your ad spend and current ROAS. We'll show you the gap.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <Field label="Monthly Ad Spend (₹)" placeholder="e.g. 500000" />
            <Field label="Current ROAS (x)" placeholder="e.g. 2.1" />
          </div>
          <div className="px-5 py-4 rounded-lg bg-gradient-to-r from-brand-purple/15 to-brand-cyan/15 border border-white/10 mb-5">
            <div className="text-xs text-zinc-400 uppercase tracking-widest font-mono mb-1">Estimated Monthly Revenue You Are Missing:</div>
            <div className="text-3xl md:text-4xl font-bold gradient-text-brand neon-text-purple tracking-tight">₹ ___,___</div>
            <div className="text-[11px] text-zinc-500 mt-1 italic">Based on Vametrix average efficiency increase of 35%.</div>
          </div>
          <a href="#contact" className="block w-full text-center px-7 py-3.5 rounded-md bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-semibold hover:opacity-90 transition neon-border-purple">
            Recapture This Revenue · Get Your ROI Plan →
          </a>
        </div>
      </div>
    </section>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2 block">{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-cyan/50 transition"
      />
    </div>
  );
}

// ─────────────── CONTACT CTA ───────────────
function CTASection() {
  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-panel rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-cyan/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-purple/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-brand-cyan mb-3 font-mono">— Ready to scale?</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">Let's engineer your revenue.</h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
              Leave your email. We'll send you a preliminary audit checklist within 24 hours.
            </p>
            <form className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
              <input
                type="email"
                placeholder="your@business.com"
                className="flex-1 w-full bg-black/40 border border-white/10 rounded-md px-5 py-3.5 text-sm focus:outline-none focus:border-brand-cyan/50 transition"
              />
              <button type="submit" className="w-full md:w-auto px-7 py-3.5 rounded-md bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-semibold hover:opacity-90 transition neon-border-purple flex items-center justify-center gap-2 shrink-0">
                Start growth chat
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-6 text-xs text-zinc-500 flex-wrap font-mono">
              <span className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-brand-cyan" strokeWidth={2.5} /> 24h response</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-brand-cyan" strokeWidth={2.5} /> Free audit</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-brand-cyan" strokeWidth={2.5} /> No-BS Guarantee</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-brand-cyan" strokeWidth={2.5} /> Founder-led</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────── FOOTER ───────────────
function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center text-white font-bold text-sm">V</div>
            <div>
              <div className="text-base font-bold tracking-tight">vametrix</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Data-driven growth agency</div>
            </div>
          </div>
          <div className="flex items-center gap-7 text-xs text-zinc-400 font-medium">
            <Link href="/login" className="hover:text-white transition">Client login</Link>
            <a href="#pillars" className="hover:text-white transition">Services</a>
            <a href="#proof" className="hover:text-white transition">Case studies</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[11px] text-zinc-600 font-mono uppercase tracking-widest">© 2026 Vametrix · Hyderabad · India</div>
          <div className="text-[11px] text-zinc-600 font-mono">
            <a href="#" className="hover:text-zinc-400 transition mr-4">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
