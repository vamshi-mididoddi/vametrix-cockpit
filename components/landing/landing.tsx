import Link from 'next/link';
import { ArrowRight, Bot, MessageCircle, Rocket, Shield, Sparkles, Target, TrendingUp, Workflow, Brain, Eye, Activity, CircleCheck } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-zinc-100 overflow-x-hidden">
      <NavBar />
      <Hero />
      <TrustStrip />
      <FeatureBento />
      <HowItWorks />
      <AgentsShowcase />
      <ClosedLoopSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ───────────────────────── NAV ─────────────────────────
function NavBar() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-bg-border">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-sm shadow-glow ring-1 ring-white/10">V</div>
          <div className="font-semibold tracking-tight text-base">Vametrix</div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
          <a href="#features" className="hover:text-zinc-100 transition">Features</a>
          <a href="#how" className="hover:text-zinc-100 transition">How it works</a>
          <a href="#agents" className="hover:text-zinc-100 transition">Agents</a>
          <a href="#pricing" className="hover:text-zinc-100 transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-zinc-300 hover:text-white px-3 py-1.5 rounded-md transition">Sign in</Link>
          <Link href="/login" className="text-sm font-medium px-4 py-1.5 rounded-md bg-white text-bg hover:bg-zinc-200 transition">
            Get started →
          </Link>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────── HERO ─────────────────────────
function Hero() {
  return (
    <section className="relative pt-24 pb-32 px-6">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-32 right-1/4 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_50%)]" />
        <GridPattern />
      </div>

      <div className="max-w-5xl mx-auto relative text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-card/70 border border-bg-border text-xs text-zinc-400 mb-8 backdrop-blur-sm animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          <span>The autonomous AI engine for Indian businesses</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] mb-6 animate-slide-up">
          <span className="bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">Your sales + marketing</span>
          <br/>
          <span className="bg-gradient-to-br from-accent-400 via-emerald-300 to-accent-500 bg-clip-text text-transparent">on autopilot.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          16 AI agents work together — qualify WhatsApp leads, generate ads with Nano Banana,
          launch Meta campaigns, route to sales reps, and close the ROAS feedback loop with Meta CAPI.
          <span className="text-zinc-300 font-medium"> You sleep. The engine works.</span>
        </p>

        <div className="flex items-center justify-center gap-3 mb-16">
          <Link href="/login" className="group px-6 py-3 rounded-lg bg-white text-bg font-semibold text-base hover:bg-zinc-200 transition flex items-center gap-2 shadow-lg">
            Get started free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" strokeWidth={2.5} />
          </Link>
          <a href="#how" className="px-6 py-3 rounded-lg border border-bg-border hover:bg-bg-card font-medium text-base transition flex items-center gap-2 text-zinc-300">
            See how it works
          </a>
        </div>

        {/* Hero visual — product mockup */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-bg-border bg-bg-card shadow-pop overflow-hidden">
            <div className="border-b border-bg-border bg-bg-soft/50 px-4 py-2.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-accent-500/70" />
              <span className="ml-3 text-[11px] text-zinc-500 font-mono">vametrix.com/dashboard</span>
            </div>
            <div className="p-8 grid grid-cols-4 gap-3 bg-bg">
              <DemoCard label="HEALTHY" value="20" sub="agents online" color="accent" />
              <DemoCard label="🔥 HOT" value="3" sub="leads waiting" color="rose" />
              <DemoCard label="Won (30d)" value="₹4.2L" sub="42 deals" color="violet" />
              <DemoCard label="CPL trend" value="↓ 18%" sub="vs last week" color="accent" />
              <div className="col-span-4 mt-2 px-4 py-3 bg-bg-card border border-bg-border rounded-md flex items-center gap-3">
                <span className="text-xs text-violet-300 font-mono uppercase tracking-wider">CEO digest</span>
                <span className="text-sm text-zinc-300 italic line-clamp-1">"Engine healthy. 3 hot DCal leads need rep response within 4 hours."</span>
              </div>
            </div>
          </div>
          <div className="absolute -inset-x-4 -bottom-4 h-20 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

function DemoCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'accent' | 'rose' | 'violet' }) {
  const c =
    color === 'accent' ? 'text-accent-400' :
    color === 'rose' ? 'text-rose-400' :
    'text-violet-400';
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${c}`}>{value}</div>
      <div className="text-[10px] text-zinc-600">{sub}</div>
    </div>
  );
}

function GridPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

// ───────────────────────── TRUST ─────────────────────────
function TrustStrip() {
  return (
    <section className="py-12 px-6 border-y border-bg-border bg-bg-soft/40">
      <div className="max-w-5xl mx-auto text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-5">Trusted by Indian operators</div>
        <div className="flex items-center justify-center gap-10 flex-wrap text-zinc-400">
          <Brand label="Befach International" />
          <Brand label="DCal Hardwater" />
          <Brand label="Befach Diet" />
          <Brand label="GCOM Imports" />
          <Brand label="Essentio" />
        </div>
      </div>
    </section>
  );
}

function Brand({ label }: { label: string }) {
  return <div className="text-sm font-medium tracking-tight opacity-50 hover:opacity-100 transition">{label}</div>;
}

// ───────────────────────── FEATURES BENTO ─────────────────────────
function FeatureBento() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-accent-400 mb-3">The engine</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            One engine. Sixteen specialists.
            <br/>
            <span className="bg-gradient-to-br from-zinc-400 to-zinc-600 bg-clip-text text-transparent">Zero context switches.</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
            Each agent is best-in-class at one job. The CEO agent coordinates them. You see only what matters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            colSpan="md:col-span-2"
            icon={<MessageCircle className="w-6 h-6" strokeWidth={1.5} />}
            tint="accent"
            title="WhatsApp Qualifier"
            tag="Live"
            description="First-contact AI on WhatsApp. Detects Telugu/English/Hindi automatically. Qualifies in 3-5 turns. Scores 0-100. Auto-routes to your team."
            highlight="మీ నీళ్లలో TDS 400 దాటి ఉండొచ్చు! Get a free test."
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" strokeWidth={1.5} />}
            tint="violet"
            title="Nano Banana Creatives"
            tag="Live"
            description="Generates ad images via Gemini 2.5 Flash. Telugu/Hindi copy variants. Uploads to CDN. Approval queue before launch."
          />

          <FeatureCard
            icon={<Rocket className="w-6 h-6" strokeWidth={1.5} />}
            tint="accent"
            title="Marketing Strategist"
            tag="Live"
            description="Claude Sonnet thinks like a senior performance marketer. Plans funnel + budget + creative brief + tech checklist in one shot."
          />
          <FeatureCard
            colSpan="md:col-span-2"
            icon={<TrendingUp className="w-6 h-6" strokeWidth={1.5} />}
            tint="rose"
            title="Closed-loop ROAS"
            tag="Live"
            description="When a deal closes, Vametrix tells Meta. Meta optimizes ads toward people who actually BUY, not just qualify. The holy-grail feedback loop most companies never close."
            highlight="Meta CAPI Purchase event → real-money targeting"
          />

          <FeatureCard
            icon={<Shield className="w-6 h-6" strokeWidth={1.5} />}
            tint="violet"
            title="VAMETRIX CEO"
            tag="Live"
            description="The meta-supervisor. Watches all 16 agents every 5 min. LLM-generated executive digests every hour. Catches stuck workflows before you do."
          />
          <FeatureCard
            icon={<Brain className="w-6 h-6" strokeWidth={1.5} />}
            tint="accent"
            title="Cockpit-as-CRM"
            tag="Live"
            description="Your team works leads inside Vametrix — pipeline, activity timeline, Mark Won/Lost. No Zoho/HubSpot needed."
          />
          <FeatureCard
            icon={<Activity className="w-6 h-6" strokeWidth={1.5} />}
            tint="rose"
            title="Performance Marketer"
            tag="Live"
            description="Daily audit + decision engine + anomaly guard + auto-execute. Pauses bleeding campaigns, scales winners — autonomously."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description, tag, tint, colSpan, highlight }: {
  icon: any; title: string; description: string; tag?: string; tint?: 'accent' | 'violet' | 'rose'; colSpan?: string; highlight?: string;
}) {
  const tintCls =
    tint === 'rose' ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' :
    tint === 'violet' ? 'text-violet-300 bg-violet-500/10 border-violet-500/20' :
    'text-accent-300 bg-accent-500/10 border-accent-500/20';
  return (
    <div className={`${colSpan || ''} group bg-bg-card border border-bg-border rounded-2xl p-6 hover:border-bg-borderhover hover:bg-bg-cardhover transition-all`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tintCls}`}>
          {icon}
        </div>
        {tag && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300 border border-accent-500/30 font-semibold tracking-wider">
            {tag.toUpperCase()}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-zinc-400 text-[14px] leading-relaxed">{description}</p>
      {highlight && (
        <div className="mt-4 px-3 py-2 rounded-lg bg-bg-soft border border-bg-border font-mono text-xs text-zinc-300 leading-relaxed">
          {highlight}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── HOW IT WORKS ─────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Set up in minutes',
      desc: 'Connect Meta + WhatsApp + your tools. Fill brand context. Vametrix learns your ICP, voice, products.',
      icon: <Workflow className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      num: '02',
      title: 'Launch with AI',
      desc: 'Tell the strategist "Get 50 leads at ₹200 CPL". It plans, generates Nano Banana ads, drafts Meta campaigns. You approve.',
      icon: <Rocket className="w-5 h-5" strokeWidth={1.5} />,
    },
    {
      num: '03',
      title: 'Close the loop',
      desc: 'Leads land in WhatsApp → qualified by AI → auto-assigned to your reps → Mark Won → Meta optimizes for real buyers.',
      icon: <Target className="w-5 h-5" strokeWidth={1.5} />,
    },
  ];

  return (
    <section id="how" className="py-24 px-6 border-y border-bg-border bg-bg-soft/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-accent-400 mb-3">How it works</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">From zero to closed deal — autonomously.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(s => (
            <div key={s.num} className="bg-bg-card border border-bg-border rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-6xl font-bold text-bg-border tabular-nums">{s.num}</div>
              <div className="w-10 h-10 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 flex items-center justify-center mb-4">
                {s.icon}
              </div>
              <h3 className="text-lg font-semibold tracking-tight mb-2">{s.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── AGENTS SHOWCASE ─────────────────────────
function AgentsShowcase() {
  const agents = [
    { num: 0, name: 'VAMETRIX CEO', desc: 'Watches the engine. LLM digests.' },
    { num: 1, name: 'WhatsApp Qualifier', desc: 'Qualifies leads in your customer\'s language.' },
    { num: 7, name: 'Creative Factory', desc: 'Nano Banana images + copy variants.' },
    { num: 8, name: 'Performance Marketer', desc: 'Daily audits, auto-execute, anomaly guard.' },
    { num: 14, name: 'Lead Router & CRM', desc: 'Auto-assigns + activity timeline.' },
    { num: 15, name: 'Analytics Reporter', desc: 'Daily 7 AM founder brief.' },
    { num: 87, name: 'Marketing Strategist', desc: 'Claude Sonnet plans your funnel.' },
    { num: 88, name: 'Creative Generator', desc: 'Telugu/Hindi/English ad copy.' },
    { num: 89, name: 'Tech Stack Auditor', desc: 'Pixel/CAPI/GA4/Clarity health.' },
    { num: 90, name: 'Ad Launcher', desc: 'Meta campaigns in PAUSED draft.' },
    { num: 91, name: 'CAPI Purchase Loop', desc: 'Tells Meta about real buyers.' },
  ];

  return (
    <section id="agents" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-accent-400 mb-3">The fleet</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            16 agents.
            <br/>
            <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">One brain.</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Each agent is specialized — but they don't work in silos. The CEO agent coordinates them and reports up to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {agents.map(a => (
            <div key={a.num} className="group bg-bg-card border border-bg-border rounded-xl p-4 hover:border-accent-500/30 hover:bg-bg-cardhover transition-all">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="font-mono text-xs text-zinc-600">#{String(a.num).padStart(2, '0')}</div>
                <span className="w-1 h-1 rounded-full bg-accent-500 dot-pulse" />
              </div>
              <div className="text-[15px] font-semibold tracking-tight mb-1">{a.name}</div>
              <div className="text-xs text-zinc-500 leading-relaxed">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── CLOSED LOOP ─────────────────────────
function ClosedLoopSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-accent-500/5 via-violet-500/5 to-rose-500/5 pointer-events-none" />
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-rose-400 mb-3">The killer feature</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            The closed-loop ROAS engine
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Most companies tell Meta about leads. We tell Meta about <span className="text-zinc-200 font-semibold">deals that actually closed.</span>
          </p>
        </div>

        <div className="bg-bg-card border border-bg-border rounded-2xl p-8 shadow-pop">
          <div className="space-y-3 font-mono text-sm">
            <Step n="1" text="Meta ad runs · user clicks WhatsApp button" />
            <Step n="2" text="Agent #10 qualifies in Telugu/English in 3-5 turns" tint="accent" />
            <Step n="3" text="Score ≥ 70 → Agent #14 auto-assigns to sales rep" tint="accent" />
            <Step n="4" text="Sales rep closes deal · enters ₹50,000 in cockpit" />
            <Step n="5" text="Agent #91 fires Meta CAPI Purchase event with the original ad click ID" tint="rose" />
            <Step n="6" text="Meta now optimizes ads toward people who will ACTUALLY BUY" tint="rose" />
          </div>
          <div className="mt-6 px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm text-rose-200">
            Result: <strong>Real-money optimization.</strong> Most marketers optimize for lead-form fills.
            We optimize for revenue. Different game.
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, text, tint }: { n: string; text: string; tint?: 'accent' | 'rose' }) {
  const dotCls = tint === 'rose' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : tint === 'accent' ? 'bg-accent-500/15 text-accent-300 border-accent-500/30' : 'bg-bg-soft text-zinc-400 border-bg-border';
  return (
    <div className="flex items-center gap-4">
      <div className={`w-7 h-7 rounded-md border ${dotCls} flex items-center justify-center text-xs font-bold shrink-0`}>{n}</div>
      <div className="text-zinc-300">{text}</div>
    </div>
  );
}

// ───────────────────────── CTA ─────────────────────────
function CTASection() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-bg-card border border-bg-border rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-violet-500/5 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-accent-500/20 rounded-full blur-[120px]" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
              Ready to automate?
            </h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
              Set up your engine in 15 minutes. First 100 qualified leads on us.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/login" className="px-7 py-3.5 rounded-lg bg-white text-bg font-semibold text-base hover:bg-zinc-200 transition flex items-center gap-2 shadow-lg group">
                Start free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" strokeWidth={2.5} />
              </Link>
              <a href="mailto:user@befach.com?subject=Vametrix Demo" className="px-7 py-3.5 rounded-lg border border-bg-border hover:bg-bg-soft font-medium text-base transition text-zinc-300">
                Book a demo
              </a>
            </div>

            <div className="mt-10 pt-8 border-t border-bg-border flex items-center justify-center gap-6 text-sm text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-accent-400" strokeWidth={2} /> Setup in 15 min</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-accent-400" strokeWidth={2} /> Telugu/English/Hindi</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-accent-400" strokeWidth={2} /> Meta CAPI closed-loop</span>
              <span className="flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-accent-400" strokeWidth={2} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── FOOTER ─────────────────────────
function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-bg-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xs">V</div>
            <div className="text-sm font-semibold tracking-tight">Vametrix</div>
            <span className="text-xs text-zinc-600 mx-2">·</span>
            <span className="text-xs text-zinc-500">Autonomous AI for sales + marketing</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <Link href="/login" className="hover:text-zinc-300 transition">Sign in</Link>
            <a href="#features" className="hover:text-zinc-300 transition">Features</a>
            <a href="#agents" className="hover:text-zinc-300 transition">Agents</a>
            <a href="mailto:user@befach.com" className="hover:text-zinc-300 transition">Contact</a>
          </div>
        </div>
        <div className="mt-8 text-[11px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
          © 2026 Vametrix · Hyderabad · India
        </div>
      </div>
    </footer>
  );
}
