import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleCheck, MessageSquare, Sparkles, Target, Zap, Shield, BarChart3, Workflow, Bot, Globe, Layers } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-zinc-200 overflow-x-hidden font-sans antialiased">
      <NavBar />
      <Hero />
      <LogoBar />
      <ProblemSection />
      <ProductSection />
      <FeatureGrid />
      <FlowSection />
      <UseCasesSection />
      <CompareSection />
      <PricingSection />
      <TestimonialSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ──────────────────────── NAV ────────────────────────
function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-bg/80 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xs shadow-lg ring-1 ring-white/10">V</div>
            <span className="font-semibold tracking-tight text-[15px]">Vametrix Engine</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="#product" className="hover:text-white transition">Product</a>
            <a href="#how" className="hover:text-white transition">How it works</a>
            <a href="#use-cases" className="hover:text-white transition">Use cases</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-[13px] text-zinc-400 hover:text-white px-3 py-1.5 transition">Sign in</Link>
          <Link href="/login" className="text-[13px] font-medium px-3.5 py-1.5 rounded-md bg-white text-bg hover:bg-zinc-200 transition flex items-center gap-1">
            Get started
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ──────────────────────── HERO ────────────────────────
function Hero() {
  return (
    <section className="relative pt-20 pb-24 px-6 overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] bg-accent-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-32 left-1/3 w-[600px] h-[500px] bg-violet-500/8 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_60%)]" />
        <GridBG />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center">
          <a href="#product" className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[12px] text-zinc-300 mb-7 hover:border-white/20 transition">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            <span>Now live with VAMETRIX CEO — the autonomous supervisor</span>
            <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
          </a>

          <h1 className="text-[44px] md:text-[68px] font-semibold tracking-[-0.025em] leading-[1.05] mb-6">
            <span className="text-white">Your sales + marketing</span>
            <br/>
            <span className="bg-gradient-to-br from-accent-300 via-emerald-200 to-accent-500 bg-clip-text text-transparent">on autopilot.</span>
          </h1>

          <p className="text-[18px] md:text-[20px] text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
            One AI engine that runs your entire growth motion — from the ad click to the closed deal.
            <span className="text-zinc-200"> Replace 12 tools.</span> Built for Indian businesses ready to scale.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login" className="group px-5 py-3 rounded-md bg-white text-bg font-semibold text-[14px] hover:bg-zinc-100 transition flex items-center gap-2 shadow-2xl">
              Start free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" strokeWidth={2.5} />
            </Link>
            <a href="#how" className="px-5 py-3 rounded-md border border-white/10 hover:bg-white/[0.04] font-medium text-[14px] text-zinc-300 transition">
              See how it works
            </a>
          </div>

          <div className="mt-7 text-[12px] text-zinc-500 flex items-center justify-center gap-5 flex-wrap">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent-400" strokeWidth={2.5} /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent-400" strokeWidth={2.5} /> Setup in 15 min</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent-400" strokeWidth={2.5} /> Telugu / Hindi / English</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-accent-400" strokeWidth={2.5} /> Cancel anytime</span>
          </div>
        </div>

        {/* Product mockup */}
        <div className="mt-20 relative">
          <div className="absolute inset-x-12 -top-12 h-32 bg-gradient-to-b from-accent-500/20 to-transparent blur-2xl" />
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}

function GridBG() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="herogrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#herogrid)" />
    </svg>
  );
}

function ProductMockup() {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-card shadow-2xl shadow-black/60 overflow-hidden mx-auto max-w-5xl">
      <div className="border-b border-white/10 bg-bg-soft/60 px-4 py-2.5 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-[11px] text-zinc-500 font-mono">vametrix.com/dashboard</span>
      </div>
      <div className="grid grid-cols-12 min-h-[420px]">
        {/* Sidebar mockup */}
        <div className="col-span-2 border-r border-white/[0.06] bg-bg-soft/40 p-3 text-[10px] text-zinc-500 hidden md:block">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-accent-400 to-accent-600" />
            <span className="text-zinc-300 font-semibold">Befach</span>
          </div>
          <div className="space-y-1">
            <div className="px-2 py-1 rounded bg-accent-500/10 text-accent-300">Overview</div>
            <div className="px-2 py-1 text-zinc-500">VAMETRIX CEO</div>
            <div className="px-2 py-1 text-zinc-500">Lead pipeline · <span className="text-rose-300">3 🔥</span></div>
            <div className="px-2 py-1 text-zinc-500">WhatsApp inbox</div>
            <div className="px-2 py-1 text-zinc-500">Marketing brain</div>
          </div>
        </div>
        {/* Main */}
        <div className="col-span-12 md:col-span-10 p-6 bg-bg">
          <div className="grid grid-cols-4 gap-3 mb-5">
            <MockKpi label="HEALTHY" value="20" sub="agents online" color="accent" />
            <MockKpi label="🔥 HOT" value="3" sub="leads waiting" color="rose" />
            <MockKpi label="Won (30d)" value="₹4.2L" sub="42 deals" color="violet" />
            <MockKpi label="CPL trend" value="↓ 18%" sub="vs last week" color="accent" />
          </div>
          <div className="px-4 py-3 rounded-md bg-bg-card border border-white/[0.06] mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] uppercase tracking-widest text-violet-300 font-mono">VAMETRIX CEO · digest</span>
              <span className="text-[9px] text-zinc-600">·</span>
              <span className="text-[10px] text-zinc-500">2m ago</span>
            </div>
            <div className="text-[13px] text-zinc-300 italic">
              "Engine healthy. 3 hot DCal leads need rep response within 4 hours. CAPI Purchase loop active."
            </div>
          </div>
          <div className="px-4 py-3 rounded-md bg-bg-card border border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">Live pipeline</div>
            <div className="grid grid-cols-6 gap-2 text-[10px]">
              <PipeBar label="New" count={12} pct={20} />
              <PipeBar label="Engaged" count={8} pct={14} />
              <PipeBar label="Qualified" count={6} pct={10} />
              <PipeBar label="Hot" count={3} pct={5} hot />
              <PipeBar label="Won" count={42} pct={71} won />
              <PipeBar label="Lost" count={3} pct={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockKpi({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'accent' | 'rose' | 'violet' }) {
  const c = color === 'accent' ? 'text-accent-300' : color === 'rose' ? 'text-rose-300' : 'text-violet-300';
  return (
    <div className="rounded-md border border-white/[0.06] bg-bg-card p-3">
      <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${c}`}>{value}</div>
      <div className="text-[10px] text-zinc-600">{sub}</div>
    </div>
  );
}

function PipeBar({ label, count, pct, hot, won }: { label: string; count: number; pct: number; hot?: boolean; won?: boolean }) {
  const bar = hot ? 'bg-rose-500' : won ? 'bg-accent-500' : 'bg-zinc-600';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-zinc-500 uppercase tracking-wider">{label}</span>
        <span className={hot ? 'text-rose-300' : won ? 'text-accent-300' : 'text-zinc-400'}>{count}</span>
      </div>
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ──────────────────────── LOGO BAR ────────────────────────
function LogoBar() {
  return (
    <section className="py-12 px-6 border-y border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-7 font-medium">
          Trusted by ambitious Indian businesses
        </div>
        <div className="flex items-center justify-center gap-x-12 gap-y-4 flex-wrap text-zinc-500 text-[15px] font-semibold tracking-tight">
          <span className="opacity-60 hover:opacity-100 transition">Befach International</span>
          <span className="opacity-60 hover:opacity-100 transition">DCal</span>
          <span className="opacity-60 hover:opacity-100 transition">Befach Diet</span>
          <span className="opacity-60 hover:opacity-100 transition">GCOM Imports</span>
          <span className="opacity-60 hover:opacity-100 transition">Essentio</span>
          <span className="opacity-60 hover:opacity-100 transition">Wellness</span>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── PROBLEM ────────────────────────
function ProblemSection() {
  const pains = [
    {
      icon: <Target className="w-5 h-5" strokeWidth={1.75} />,
      title: "You're paying for clicks, not customers.",
      desc: "Meta optimizes for form fills. Your CRM tracks pipeline. They never talk. You scale ads that produce leads, not revenue.",
    },
    {
      icon: <Zap className="w-5 h-5" strokeWidth={1.75} />,
      title: "Hot leads are going cold.",
      desc: "When a customer messages on WhatsApp at 9 PM, your sales rep replies the next morning. By then the lead's already shopping with a competitor.",
    },
    {
      icon: <Layers className="w-5 h-5" strokeWidth={1.75} />,
      title: "You're flying blind.",
      desc: "Meta Ads, CRM, WhatsApp, Zapier, Klaviyo, HubSpot — 12 tools, 12 dashboards, none in sync. Your team spends more time switching tabs than closing deals.",
    },
  ];
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">The problem</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight leading-tight">
            Your growth stack is bleeding<br/>money in three places.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pains.map((p, i) => (
            <div key={i} className="bg-bg-card border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] transition">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center justify-center mb-5">
                {p.icon}
              </div>
              <h3 className="text-[17px] font-semibold mb-3 tracking-tight leading-tight">{p.title}</h3>
              <p className="text-[14px] text-zinc-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── PRODUCT (the solution) ────────────────────────
function ProductSection() {
  return (
    <section id="product" className="py-24 px-6 border-y border-white/[0.06] bg-white/[0.012]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">The solution</div>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-tight leading-tight mb-5">
            One platform.<br/>
            <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">From click to closed deal.</span>
          </h2>
          <p className="text-[17px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Vametrix Engine runs your entire growth motion. AI agents qualify leads in their language,
            launch your ads on Meta, route hot leads to your reps, and tell Meta which deals actually
            closed — so your ad spend optimizes for real revenue.
          </p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── FEATURE GRID ────────────────────────
function FeatureGrid() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">Inside the engine</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight leading-tight">
            Built for how real businesses<br/>actually grow.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FeatureCardLarge
            colSpan="md:col-span-7"
            icon={<MessageSquare className="w-6 h-6" strokeWidth={1.5} />}
            tag="WhatsApp Qualifier"
            title="Your first AI sales rep — fluent in Telugu, Hindi, English."
            desc="Meta ad → click-to-WhatsApp → our AI takes over. Auto-detects the customer's language, asks the right qualification questions, scores 0-100, escalates hot leads to your team. 24/7. No retainer."
            sample={[
              { dir: 'in',  text: 'మీ సాఫ్ట్‌నెర్ ధర ఎంత?' },
              { dir: 'out', text: 'DCal Pro starts at ₹18,999. మీ ఇంట్లో ఎంత మంది ఉంటారు?' },
              { dir: 'in',  text: '4 people. Apartment in Madhapur' },
              { dir: 'out', text: 'Perfect. DCal Pro 200L/hr fits 3BHK. Free demo at your home?' },
            ]}
          />
          <FeatureCard
            colSpan="md:col-span-5"
            icon={<Sparkles className="w-6 h-6" strokeWidth={1.5} />}
            tag="Creative Factory"
            title="AI ads in your customer's language."
            desc="Nano Banana generates ad images. Gemini writes Telugu / Hindi / English variants. Uploads to your Storage CDN. You approve in one click."
          />
          <FeatureCard
            colSpan="md:col-span-5"
            icon={<Bot className="w-6 h-6" strokeWidth={1.5} />}
            tag="Marketing Strategist"
            title="A senior CMO in every brief."
            desc="Tell it your goal: '50 leads at ₹200 CPL in Telangana.' Claude Sonnet plans the funnel, picks the audience, drafts your Meta campaign, ships it as PAUSED for your approval."
          />
          <FeatureCardLarge
            colSpan="md:col-span-7"
            icon={<BarChart3 className="w-6 h-6" strokeWidth={1.5} />}
            tag="Closed-loop ROAS"
            title="Meta CAPI Purchase events on real deals."
            desc="When your rep marks a deal Won in our cockpit, the engine fires a Meta CAPI Purchase event with the deal value + the original ad click ID. Meta now optimizes for buyers, not just form fills. The holy grail of paid acquisition — closed."
            sample={[
              { dir: 'out', text: '✓ Lead marked WON · ₹50,000' },
              { dir: 'out', text: '→ Meta CAPI Purchase event sent' },
              { dir: 'out', text: '→ Ad set now targeting buyers like this one' },
            ]}
          />

          <FeatureCard
            colSpan="md:col-span-4"
            icon={<Shield className="w-6 h-6" strokeWidth={1.5} />}
            tag="VAMETRIX CEO"
            title="The supervisor that watches everything."
            desc="Monitors 20 agents every 5 min. LLM digests every hour. Catches stuck workflows before you do. Reports up only when you need to act."
          />
          <FeatureCard
            colSpan="md:col-span-4"
            icon={<Workflow className="w-6 h-6" strokeWidth={1.5} />}
            tag="Cockpit-as-CRM"
            title="Your sales team's home base."
            desc="Pipeline view. Activity timeline. Mark Won / Lost. No Zoho or HubSpot needed. Build pipeline inside the same tool your AI is selling from."
          />
          <FeatureCard
            colSpan="md:col-span-4"
            icon={<Globe className="w-6 h-6" strokeWidth={1.5} />}
            tag="Multi-brand"
            title="One engine, multiple brands."
            desc="Befach runs DCal, Befach Diet, Wellness, Essentio — all from one Vametrix instance. Each brand has its own ICP, voice, products, ad accounts."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, tag, title, desc, colSpan }: { icon: any; tag: string; title: string; desc: string; colSpan?: string }) {
  return (
    <div className={`${colSpan || ''} bg-bg-card border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] hover:bg-bg-cardhover transition group`}>
      <div className="w-11 h-11 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 flex items-center justify-center mb-5">
        {icon}
      </div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{tag}</div>
      <h3 className="text-[19px] font-semibold tracking-tight mb-3 leading-snug">{title}</h3>
      <p className="text-[14px] text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCardLarge({ icon, tag, title, desc, sample, colSpan }: { icon: any; tag: string; title: string; desc: string; sample: { dir: 'in' | 'out'; text: string }[]; colSpan?: string }) {
  return (
    <div className={`${colSpan || ''} bg-bg-card border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] transition`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div>
          <div className="w-11 h-11 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 flex items-center justify-center mb-5">
            {icon}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{tag}</div>
          <h3 className="text-[20px] font-semibold tracking-tight mb-3 leading-snug">{title}</h3>
          <p className="text-[14px] text-zinc-400 leading-relaxed">{desc}</p>
        </div>
        <div className="space-y-2 self-center">
          {sample.map((m, i) => (
            <div key={i} className={`flex ${m.dir === 'in' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-[13px] ${m.dir === 'in' ? 'bg-bg-soft text-zinc-300' : 'bg-accent-500/15 text-accent-100 border border-accent-500/20'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── FLOW (how it works) ────────────────────────
function FlowSection() {
  return (
    <section id="how" className="py-24 px-6 border-y border-white/[0.06] bg-white/[0.012]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">How it works</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight">
            From an ad to a closed deal.<br/>
            <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">Autonomously.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { n: '01', t: 'Meta ad runs', d: 'Vametrix or your team launches a click-to-WhatsApp ad on Meta. Click ID is captured.' },
            { n: '02', t: 'AI qualifies', d: 'Customer messages. Agent #10 detects language, asks 3-5 questions, scores 0-100.' },
            { n: '03', t: 'Auto-route to your rep', d: 'Qualified lead auto-assigned to the rep with fewest open leads. Cockpit lights up.' },
            { n: '04', t: 'Your rep closes', d: 'Rep works the lead inside Vametrix — calls, notes, status updates. Marks Won + deal value.' },
            { n: '05', t: 'Meta CAPI Purchase fires', d: 'Engine tells Meta this customer was a real buyer. Meta optimizes for real-money targeting.' },
            { n: '06', t: 'You see the loop', d: 'CEO digest summarizes the engine state. ROAS climbs. You scale what works.' },
          ].map((s, i) => (
            <div key={s.n} className="bg-bg-card border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition flex items-start gap-5">
              <div className="text-[13px] font-mono text-zinc-500 w-10 shrink-0 tabular-nums">{s.n}</div>
              <div className="flex-1">
                <div className="text-[16px] font-semibold tracking-tight mb-1">{s.t}</div>
                <div className="text-[14px] text-zinc-400 leading-relaxed">{s.d}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── USE CASES ────────────────────────
function UseCasesSection() {
  const cases = [
    { t: 'B2B importers', d: 'Inbound WhatsApp from MSME importers. Qualify by product, HS code, MOQ. Route to relevant sales rep by vertical.', icon: <Workflow className="w-5 h-5" strokeWidth={1.5} /> },
    { t: 'DTC brands', d: 'Meta-driven WhatsApp conversations. Auto-qualify by city, pincode, intent. Hot lead alerts. Closed-loop CAPI for paid scale.', icon: <Target className="w-5 h-5" strokeWidth={1.5} /> },
    { t: 'Local services', d: 'Hyderabad/Bangalore service businesses (interiors, softeners, training). AI handles inbound 24/7. You handle close.', icon: <MessageSquare className="w-5 h-5" strokeWidth={1.5} /> },
    { t: 'Agencies', d: "Run multiple clients on one Vametrix instance. White-label the cockpit. Charge your clients monthly. We bill you per-tenant.", icon: <Layers className="w-5 h-5" strokeWidth={1.5} /> },
  ];
  return (
    <section id="use-cases" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">Who uses Vametrix</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight">Built for businesses that<br/>sell on WhatsApp.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map(c => (
            <div key={c.t} className="bg-bg-card border border-white/[0.06] rounded-xl p-7 hover:border-white/[0.12] transition flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center justify-center shrink-0">{c.icon}</div>
              <div>
                <h3 className="text-[18px] font-semibold tracking-tight mb-2">{c.t}</h3>
                <p className="text-[14px] text-zinc-400 leading-relaxed">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── COMPARE ────────────────────────
function CompareSection() {
  return (
    <section className="py-24 px-6 border-y border-white/[0.06] bg-white/[0.012]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">vs the stack</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight">One engine replaces 12 tools.</h2>
        </div>
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-3 bg-bg-soft/60 border-b border-white/[0.06]">
            <div className="p-4 text-[11px] uppercase tracking-widest text-zinc-500 font-medium">Capability</div>
            <div className="p-4 text-[11px] uppercase tracking-widest text-zinc-500 font-medium">Stitched stack</div>
            <div className="p-4 text-[11px] uppercase tracking-widest text-accent-400 font-semibold">Vametrix Engine</div>
          </div>
          {[
            ['WhatsApp qualifier', 'Gallabox + manual flows', 'Built in · AI in 3 languages'],
            ['Meta ad launching', 'Manual in Ads Manager', 'Strategist + draft + approve'],
            ['Ad creative generation', 'Designer / Canva', 'Nano Banana + copy variants'],
            ['Lead routing to reps', 'Manual / SDR', 'Auto-load-balanced'],
            ['CRM (pipeline + activity)', 'HubSpot / Zoho', 'Cockpit-as-CRM'],
            ['Tracking + attribution', 'GA4 + GTM + custom', 'CAPI loop · Purchase events'],
            ['Performance monitoring', 'Looker / dashboards', 'VAMETRIX CEO supervisor'],
            ['Total tools', '8–12 SaaS subscriptions', 'One platform'],
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015]">
              <div className="p-4 text-[14px] text-zinc-300">{row[0]}</div>
              <div className="p-4 text-[14px] text-zinc-500">{row[1]}</div>
              <div className="p-4 text-[14px] text-accent-300 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} /> {row[2]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── PRICING ────────────────────────
function PricingSection() {
  const tiers = [
    {
      name: 'Starter',
      price: '₹49,999',
      period: '/month',
      desc: 'For founders running their first paid acquisition systematically.',
      features: ['500 qualified leads / month', 'WhatsApp Qualifier (#10)', 'Cockpit-as-CRM', 'Daily perf audit', '2 team seats', 'Email support'],
      cta: 'Start free trial',
      featured: false,
    },
    {
      name: 'Growth',
      price: '₹99,999',
      period: '/month',
      desc: 'For businesses scaling Meta + WhatsApp into a real engine.',
      features: ['5,000 qualified leads / month', 'Everything in Starter', 'Marketing Strategist + Creative Factory', 'Ad Launcher + Auto-Execute', 'VAMETRIX CEO supervisor', 'CAPI Purchase loop', '10 team seats', 'WhatsApp support'],
      cta: 'Start free trial',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For agencies + multi-brand operators ready to scale.',
      features: ['Unlimited leads', 'Multi-tenant + white-label', 'Dedicated success engineer', 'Custom AI agents', 'SLA-backed uptime', 'Priority WhatsApp ops', 'Self-host option'],
      cta: 'Talk to sales',
      featured: false,
    },
  ];
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">Pricing</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight">Simple pricing.<br/>Scale when you scale.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map(t => (
            <div key={t.name} className={`rounded-2xl p-7 transition relative ${t.featured ? 'bg-bg-card border-2 border-accent-500/40 shadow-2xl shadow-accent-500/10' : 'bg-bg-card border border-white/[0.06] hover:border-white/[0.12]'}`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-accent-400 to-accent-600 text-[10px] text-white font-bold uppercase tracking-widest">Most popular</div>
              )}
              <div className="text-[15px] font-semibold tracking-tight">{t.name}</div>
              <div className="flex items-baseline gap-1 mt-2 mb-3">
                <span className="text-[36px] font-semibold tracking-tight tabular-nums">{t.price}</span>
                <span className="text-[13px] text-zinc-500">{t.period}</span>
              </div>
              <p className="text-[13px] text-zinc-400 mb-5 leading-relaxed">{t.desc}</p>
              <Link href="/login" className={`block w-full text-center px-4 py-2.5 rounded-md font-semibold text-[14px] mb-6 transition ${t.featured ? 'bg-white text-bg hover:bg-zinc-200' : 'bg-bg-soft text-zinc-200 border border-white/10 hover:border-white/20'}`}>
                {t.cta}
              </Link>
              <ul className="space-y-2.5 text-[13px]">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-zinc-300">
                    <Check className="w-4 h-4 text-accent-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 text-[13px] text-zinc-500">
          All plans · 14-day free trial · No credit card · Cancel anytime
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── TESTIMONIAL ────────────────────────
function TestimonialSection() {
  return (
    <section className="py-24 px-6 border-y border-white/[0.06] bg-white/[0.012]">
      <div className="max-w-4xl mx-auto text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-6 font-medium">What founders say</div>
        <blockquote className="text-[24px] md:text-[32px] font-semibold tracking-tight leading-snug text-zinc-100 mb-8">
          "We were paying ₹1.5L/month across HubSpot + Gallabox + Zapier + Klaviyo + a freelance media buyer.
          <br/>
          <span className="text-accent-300">Replaced them all with Vametrix. CPL dropped 32% in the first month.</span>"
        </blockquote>
        <div className="flex items-center justify-center gap-3 text-[13px]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-violet-500 flex items-center justify-center text-white font-bold">V</div>
          <div className="text-left">
            <div className="font-semibold text-zinc-200">Vamshi Mididoddi</div>
            <div className="text-zinc-500">Founder · Befach International</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── FAQ ────────────────────────
function FAQSection() {
  const faqs = [
    { q: 'How is this different from HubSpot or Zoho?', a: 'HubSpot and Zoho are CRMs you fill in manually. Vametrix actually qualifies, routes, and helps close leads autonomously — and tells Meta about the closed deals.' },
    { q: 'Do I need to know how to write prompts or code?', a: 'No. Vametrix gives you natural-language inputs ("get 50 DCal leads at ₹200 CPL in Telangana") and the engine handles the rest.' },
    { q: 'Does it work for non-Telugu / non-Indian businesses?', a: 'Yes. The qualifier auto-detects 12+ Indian languages. For international use, English mode works out of the box.' },
    { q: 'How long does setup take?', a: 'About 15 minutes. Connect Meta + WhatsApp Business + your CRM (or use ours). Fill one brand profile. Launch.' },
    { q: 'Is my data secure?', a: 'Tenant-isolated Supabase databases. RLS policies. Encrypted credentials. No data leaves your instance.' },
    { q: 'Can I run multiple brands on one account?', a: 'Yes. The multi-brand layer is built in. Befach runs 5 brands on one Vametrix instance.' },
  ];
  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-accent-400 mb-3 font-medium">Frequently asked</div>
          <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tight">Questions, answered.</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-bg-card border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.12] transition">
              <summary className="cursor-pointer list-none flex items-center justify-between text-[15px] font-medium text-zinc-100">
                {f.q}
                <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition" strokeWidth={2} />
              </summary>
              <div className="text-[14px] text-zinc-400 mt-3 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── FINAL CTA ────────────────────────
function FinalCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent-500/15 rounded-full blur-[120px]" />
      </div>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-[40px] md:text-[60px] font-semibold tracking-tight leading-[1.05] mb-6">
          Ready to put your<br/>
          <span className="bg-gradient-to-br from-accent-300 to-accent-600 bg-clip-text text-transparent">growth on autopilot?</span>
        </h2>
        <p className="text-[17px] text-zinc-400 mb-9 max-w-xl mx-auto leading-relaxed">
          14 days free. Setup in 15 minutes. Cancel any time.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/login" className="group px-6 py-3 rounded-md bg-white text-bg font-semibold text-[14px] hover:bg-zinc-100 transition flex items-center gap-2 shadow-2xl">
            Start free trial
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" strokeWidth={2.5} />
          </Link>
          <a href="mailto:user@befach.com?subject=Vametrix Demo" className="px-6 py-3 rounded-md border border-white/10 hover:bg-white/[0.04] font-medium text-[14px] text-zinc-300 transition flex items-center gap-2">
            Book a demo
            <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────── FOOTER ────────────────────────
function Footer() {
  return (
    <footer className="px-6 pt-16 pb-10 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xs">V</div>
              <span className="font-semibold tracking-tight">Vametrix Engine</span>
            </div>
            <p className="text-[13px] text-zinc-500 max-w-xs leading-relaxed">
              The autonomous AI engine for sales + marketing. Built in Hyderabad for ambitious Indian businesses.
            </p>
          </div>
          <FooterCol title="Product" links={[['Features','#product'],['Pricing','#pricing'],['How it works','#how'],['Use cases','#use-cases']]} />
          <FooterCol title="Company" links={[['About','#'],['Careers','#'],['Customers','#'],['Contact','mailto:user@befach.com']]} />
          <FooterCol title="Resources" links={[['FAQ','#faq'],['Docs','#'],['Status','#'],['Privacy','#']]} />
        </div>
        <div className="pt-8 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-4 text-[12px] text-zinc-600 font-mono">
          <div>© 2026 Vametrix · Made in Hyderabad, India</div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-zinc-400 transition">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition">Terms</a>
            <a href="#" className="hover:text-zinc-400 transition">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-3">{title}</div>
      <ul className="space-y-2 text-[13px]">
        {links.map(([label, href]) => (
          <li key={label}><a href={href} className="text-zinc-500 hover:text-zinc-200 transition">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}
