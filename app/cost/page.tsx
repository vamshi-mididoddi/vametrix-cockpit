import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmtINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

async function load() {
  const supa = supabaseAdmin();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: ads }, { data: convs }, { data: tpls }, { data: nurtures }, { data: humanSends }] = await Promise.all([
    supa.from('ad_campaigns_log').select('spend_inr,snapshot_date').gte('snapshot_date', monthAgo.slice(0, 10)),
    supa.from('conversations').select('id').gte('created_at', monthAgo).limit(50000),
    supa.from('conversations').select('id,meta').eq('meta->>source', 'vametrix_51_send_template').gte('created_at', monthAgo).limit(20000),
    supa.from('conversations').select('id').eq('meta->>source', 'vametrix_11_smart_followup_v4').gte('created_at', monthAgo).limit(20000),
    supa.from('conversations').select('id').eq('meta->>source', 'cockpit_human_takeover').gte('created_at', monthAgo).limit(20000),
  ]);

  const adSpend30d = (ads || []).reduce((s: number, r: any) => s + (Number(r.spend_inr) || 0), 0);
  const llmCalls = (convs || []).length; // rough — each conversation row ~ 1 LLM call
  // Gemini Flash: ~₹0.025/call
  const llmCost = Math.round(llmCalls * 0.025);
  // Meta WhatsApp Business — UTILITY conversation in India ~₹0.12, MARKETING ~₹0.85
  const templateSends = (tpls || []).length;
  const metaWaCost = Math.round(templateSends * 0.5);
  const nurtureCount = (nurtures || []).length;
  const humanCount = (humanSends || []).length;

  return {
    adSpend30d, llmCalls, llmCost, templateSends, metaWaCost, nurtureCount, humanCount,
  };
}

export default async function Page() {
  const k = await load();
  const total = k.adSpend30d + k.llmCost + k.metaWaCost;
  return (
    <>
      <TopBar title="Cost Monitor" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl">
          <div className="lg:col-span-2 bg-bg-card border border-bg-border rounded-lg p-5">
            <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3">Monthly run-rate (rolling 30d)</div>
            <div className="space-y-2 text-xs">
              <Line label="Meta Ads spend (last 30d)" value={fmtINR(k.adSpend30d)} sub="from ad_campaigns_log · all active campaigns" />
              <Line label="OpenRouter LLM (Gemini Flash)" value={fmtINR(k.llmCost)} sub={`${k.llmCalls.toLocaleString('en-IN')} calls × ~₹0.025`} />
              <Line label="Meta WhatsApp Business" value={fmtINR(k.metaWaCost)} sub={`${k.templateSends.toLocaleString('en-IN')} template sends × ~₹0.50`} />
              <Line label="Supabase (Postgres + Auth)" value="₹0" sub="within 500MB / 50k MAU free tier" />
              <Line label="n8n (shared Hostinger VPS)" value="~₹0" sub="cost shared with Befach tech team" />
              <Line label="Vercel (cockpit)" value="₹0" sub="hobby tier — within usage limits" />
              <Line label="Telegram bot" value="₹0" sub="free tier" />
              <Line label="Vapi (Voice Receptionist)" value="₹0" sub="parked — no calls yet" />
            </div>
            <div className="mt-4 pt-4 border-t border-bg-border flex justify-between items-baseline">
              <div className="text-xs text-slate-400">Total run-rate</div>
              <div className="text-xl font-semibold">{fmtINR(total)}/mo</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-bg-card border border-bg-border rounded-lg p-5">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3">Engine throughput (30d)</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Conversations</span><span className="font-semibold">{k.llmCalls.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Smart nurtures fired</span><span className="font-semibold">{k.nurtureCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Templates sent</span><span className="font-semibold">{k.templateSends}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Human take-overs</span><span className="font-semibold">{k.humanCount}</span></div>
              </div>
            </div>
            <div className="bg-bg-card border border-bg-border rounded-lg p-5">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3">Budget guard (recommended)</div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">›</span>Ad spend &gt; 1.5× 7d avg in a day → Agent #8 freezes + alerts</li>
                <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">›</span>OpenRouter &gt; ₹500/day → throttle to Gemini Flash Lite</li>
                <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">›</span>Templates &gt; 1000/day → require approval</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Line({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-bg-border last:border-0 gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-slate-200">{label}</div>
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
      <div className="font-mono tabular-nums shrink-0">{value}</div>
    </div>
  );
}
