import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { STATUS_META } from '@/lib/agents';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const [{ data: tpls }, { data: optOuts }, { data: docs }, { count: reminderCount }] = await Promise.all([
    supa.from('wa_templates').select('status').limit(200),
    supa.from('lead_opt_outs').select('phone').limit(1),
    supa.from('knowledge_documents').select('id').limit(1),
    supa.from('scheduled_reminders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    templates: (tpls || []) as any[],
    optOutCount: (optOuts || []).length,
    docCount: (docs || []).length,
    pendingReminders: reminderCount || 0,
  };
}

export default async function Page() {
  await requireAdmin();
  const k = await load();
  const approved = k.templates.filter(t => t.status === 'APPROVED').length;

  const services = [
    { name: 'Meta WhatsApp Cloud API', detail: '+91 93923 89764 (Befach 4x Pvt Ltd)', status: 'live' },
    { name: 'Meta Marketing API', detail: 'ad account 170153044 · 13 scopes granted', status: 'live' },
    { name: 'Supabase Postgres + Auth', detail: 'junllxrdbczvkrzehloo (eu-west)', status: 'live' },
    { name: 'OpenRouter (LLM gateway)', detail: 'google/gemini-2.5-flash', status: 'live' },
    { name: 'Telegram bot', detail: '@vametrix_engine_bot · chat 2035542378', status: 'live' },
    { name: 'n8n (orchestrator)', detail: 'srv1048087.hstgr.cloud (shared Hostinger VPS)', status: 'live' },
    { name: 'Vercel (cockpit hosting)', detail: 'vametrix-cockpit.vercel.app', status: 'live' },
    { name: 'Vapi (voice agent)', detail: 'assistant 74259bce-… on +1 689 699 0084', status: 'parked' },
    { name: 'Zoho CRM', detail: 'not connected — pending OAuth', status: 'planned' },
    { name: 'Apify (scraping for Buyer Hunter)', detail: 'not connected — pending API key', status: 'planned' },
  ];

  return (
    <>
      <TopBar title="Settings" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-4xl space-y-4">
          <div className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">LLM brain</h3>
            <Row label="Qualifier model" value="google/gemini-2.5-flash" sub="cost-optimized, multilingual, Indian B2B-aware" />
            <Row label="Smart follow-up model" value="google/gemini-2.5-flash" />
            <Row label="Conversation memory" value="15 messages" sub="last N messages sent to qualifier per turn" />
            <Row label="Confidence gate" value="DISABLED" valueClass="text-amber-400" sub="engine auto-sends all replies (no human-review queue)" />
            <Row label="System prompt version" value="v3 (vertical-aware + language-mirroring fix)" />
          </div>

          <div className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Lifecycle nurture thresholds</h3>
            <Row label="SOFT_CHECKIN tier" value="5 – 29 min silence" sub="light gentle ping" />
            <Row label="PATIENT tier" value="30 – 119 min silence" sub="acknowledge they may be busy" />
            <Row label="CONTEXTUAL tier" value="120 – 720 min silence" sub="reference topic + tiny value offer" />
            <Row label="REVIVAL tier" value="24h – 7d (template-based)" sub="ships once we wire a revival template" />
            <Row label="DNP_CLOSURE tier" value="7d+ (final closure)" sub="future" />
          </div>

          <div className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Engine state · live counters</h3>
            <Row label="Templates total" value={String(k.templates.length)} />
            <Row label="Templates APPROVED" value={String(approved)} valueClass="text-accent-400" />
            <Row label="Opt-outs on file" value={String(k.optOutCount)} />
            <Row label="Knowledge docs" value={String(k.docCount)} />
            <Row label="Pending reminders" value={String(k.pendingReminders)} />
            <Row label="Escalation alerts" value="LIVE → Telegram" valueClass="text-accent-400" sub="fires on stage in (escalate, hot) or next_action=escalate_to_human" />
          </div>

          <div className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Connected services</h3>
            <div className="space-y-2 text-xs">
              {services.map(s => {
                const m = STATUS_META[s.status as keyof typeof STATUS_META];
                return (
                  <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-bg-border last:border-0">
                    <div>
                      <div className="text-slate-200">{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.detail}</div>
                    </div>
                    <span className={`stage-badge ${m.bg} ${m.color}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-bg-border last:border-0 gap-3 text-xs">
      <div className="min-w-0 flex-1">
        <div className="text-slate-200">{label}</div>
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
      <div className={`font-mono tabular-nums shrink-0 ${valueClass || ''}`}>{value}</div>
    </div>
  );
}
