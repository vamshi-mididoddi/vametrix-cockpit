// Vametrix CEO — agentic brain.
// An LLM (Claude Sonnet via OpenRouter) with TOOLS wired to the real engine.
// READ tools (audit, list, quality, pipeline, health) auto-execute.
// WRITE intents (pause/activate/budget/launch) are returned as PROPOSALS — the
// user approves them in the chat, then approveCeoAction() executes them.
// This is the "propose → you approve" autonomy model.

import { supabaseAdmin } from './supabase';

const VER = 'v22.0';
const GRAPH = `https://graph.facebook.com/${VER}`;

export interface CeoCtx {
  orKey: string; orBase: string; model: string;
  metaToken: string; adAccount: string; // numeric, no act_
  n8nBase: string; n8nKey: string;
  tenantId: string;
}
export type ChatMsg = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_calls?: any[]; tool_call_id?: string; name?: string };
export type Proposal = { id: string; action: string; args: Record<string, any>; label: string; reason: string };

const SYSTEM = `You are **Vametrix CEO** — the autonomous operator of the Vametrix Engine, a multi-agent sales + marketing system. You are talking to the founder (or their marketing manager) in a chat on vametrix.com.

You operate a real Meta ad account, a WhatsApp lead engine, and a fleet of agents. You think and talk like a sharp, senior performance marketer + operator — direct, specific, numbers-first, no fluff.

HOW YOU WORK:
- For anything informational (how are campaigns doing, what's wasting money, pipeline status, agent health, diagnostics, what plans exist) — CALL THE READ TOOLS and answer from real data. Never make up numbers.
- For anything that SPENDS money or CHANGES a live campaign (pause, activate, change budget, generate a new campaign, push a campaign live to Meta) — DO NOT do it directly. Call the "propose_action" tool to put it in front of the user for one-tap approval. Explain why in plain language.

LAUNCHING A NEW CAMPAIGN (when the user asks to "run/create/launch a campaign for X"):
- Step 1: propose_action action="generate_campaign" with goal, brand, vertical, geo, daily_inr, days. On approval the engine writes the strategy + generates ad creatives (~1-2 min) and returns a plan id.
- Step 2: once a plan exists (use recent_plans to find it), propose_action action="push_campaign_to_meta" with plan_id — this builds the campaign on Meta as PAUSED for review.
- Walk the user through it conversationally; never skip the approval step.
- brand is one of: dcal, befach_diet (rice), wellness, essentio, befach_imports, gcom, mixed. vertical examples: dcal_b2b, dcal_b2c, rice_b2b, rice_b2c, wellness_b2b, imports.
- Chain tools when needed (e.g. audit first, then propose pausing the wasteful ones).
- Be concise. Use short paragraphs, tables when comparing campaigns, ₹ for money. Bold the key number or recommendation.
- When you propose actions, summarize them clearly so the user knows exactly what they're approving.
- If asked to do something you don't have a tool for, say so plainly and suggest the closest thing you can do.

You are not a generic assistant — you are the operator of THIS engine. Own it.`;

export const TOOLS = [
  { type: 'function', function: { name: 'audit_campaigns', description: 'Pull last-30-day performance for all active campaigns (spend, results, cost-per-lead, CTR, CPM, frequency). Use for "how are my campaigns doing", "what is wasting money", performance questions.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'list_campaigns', description: 'List campaigns with status, objective, and daily budget. Use to find a campaign by name or see what exists.', parameters: { type: 'object', properties: { only_active: { type: 'boolean', description: 'If true, only ACTIVE campaigns' } } } } },
  { type: 'function', function: { name: 'campaign_quality', description: 'Last-7-day ad quality diagnostics (Meta quality/engagement/conversion rankings + CPM/CTR) for currently delivering ads. Use to diagnose WHY a CPL is high or a campaign is underperforming.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_pipeline', description: 'Lead pipeline summary from the engine: counts by stage (new/engaged/qualified/hot/won/lost) and recent lead volume.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'engine_health', description: 'Health of the engine + agents: recent CEO observations / flagged issues. Use for "is anything broken", "any agent stuck".', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'recent_plans', description: 'List recently generated marketing plans (id, brand, status, when, creative count). Use to find a plan to push to Meta, or to check if a just-generated campaign is ready.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'propose_action', description: 'Propose a money-spending or campaign-changing action for the user to APPROVE. Never execute directly. Actions: pause_campaign, activate_campaign, set_daily_budget (need campaign_id); generate_campaign (needs goal+brand+geo+daily_inr — writes strategy + creatives); push_campaign_to_meta (needs plan_id — builds the PAUSED Meta campaign).', parameters: { type: 'object', properties: {
    action: { type: 'string', enum: ['pause_campaign', 'activate_campaign', 'set_daily_budget', 'generate_campaign', 'push_campaign_to_meta'], description: 'What to do' },
    campaign_id: { type: 'string', description: 'Meta campaign id (for pause/activate/budget)' },
    campaign_name: { type: 'string', description: 'Human name for display' },
    daily_inr: { type: 'number', description: 'Daily budget in rupees (set_daily_budget or generate_campaign)' },
    goal: { type: 'string', description: 'generate_campaign: the campaign goal in one line' },
    brand: { type: 'string', description: 'generate_campaign: dcal | befach_diet | wellness | essentio | befach_imports | gcom | mixed' },
    vertical: { type: 'string', description: 'generate_campaign: e.g. dcal_b2b, rice_b2b' },
    geo: { type: 'string', description: 'generate_campaign: target geography' },
    days: { type: 'number', description: 'generate_campaign: campaign duration in days' },
    plan_id: { type: 'number', description: 'push_campaign_to_meta: the plan id to launch' },
    reason: { type: 'string', description: 'Why — shown to the user' },
  }, required: ['action', 'reason'] } } },
];

async function metaGET(ctx: CeoCtx, path: string) {
  const r = await fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${ctx.metaToken}`);
  return r.json();
}

// ---------- READ tool executors ----------
async function audit_campaigns(ctx: CeoCtx) {
  const r = await metaGET(ctx, `act_${ctx.adAccount}/insights?level=campaign&date_preset=last_30d&fields=campaign_name,objective,spend,impressions,clicks,ctr,cpm,frequency,actions,cost_per_action_type&limit=200`);
  if (r.error) return { error: r.error.message };
  const rows = (r.data || []).map((c: any) => {
    const acts: any = {}; (c.actions || []).forEach((a: any) => acts[a.action_type] = Number(a.value));
    const leads = acts['onsite_conversion.lead_grouped'] || acts['lead'] || acts['offsite_conversion.fb_pixel_lead'] || 0;
    const msg = acts['onsite_conversion.messaging_conversation_started_7d'] || 0;
    const results = leads || msg;
    return { campaign: c.campaign_name, objective: (c.objective || '').replace('OUTCOME_', ''), spend_inr: Math.round(Number(c.spend)), results, kind: leads ? 'lead' : (msg ? 'msg' : '-'), cpl_inr: results ? Math.round(Number(c.spend) / results) : null, ctr: Number(c.ctr).toFixed(2), cpm_inr: Math.round(Number(c.cpm)), frequency: Number(c.frequency).toFixed(1) };
  }).filter((x: any) => x.spend_inr > 0).sort((a: any, b: any) => b.spend_inr - a.spend_inr);
  const total = rows.reduce((s: number, x: any) => s + x.spend_inr, 0);
  return { window: 'last_30d', total_spend_inr: total, campaign_count: rows.length, campaigns: rows.slice(0, 30) };
}
async function list_campaigns(ctx: CeoCtx, args: any) {
  const r = await metaGET(ctx, `act_${ctx.adAccount}/campaigns?fields=name,objective,effective_status,daily_budget&limit=200`);
  if (r.error) return { error: r.error.message };
  let c = (r.data || []).map((x: any) => ({ id: x.id, name: x.name, objective: (x.objective || '').replace('OUTCOME_', ''), status: x.effective_status, daily_inr: x.daily_budget ? Math.round(x.daily_budget / 100) : null }));
  if (args?.only_active) c = c.filter((x: any) => x.status === 'ACTIVE');
  return { count: c.length, campaigns: c.slice(0, 60) };
}
async function campaign_quality(ctx: CeoCtx) {
  const r = await metaGET(ctx, `act_${ctx.adAccount}/insights?level=ad&date_preset=last_7d&fields=campaign_name,ad_name,spend,ctr,cpm,quality_ranking,engagement_rate_ranking,conversion_rate_ranking&limit=300`);
  if (r.error) return { error: r.error.message };
  const rows = (r.data || []).filter((a: any) => Number(a.spend) > 30).map((a: any) => ({ campaign: a.campaign_name, ad: a.ad_name, spend_inr: Math.round(Number(a.spend)), ctr: Number(a.ctr).toFixed(1), cpm_inr: Math.round(Number(a.cpm)), quality: a.quality_ranking, engagement: a.engagement_rate_ranking, conversion: a.conversion_rate_ranking })).sort((a: any, b: any) => b.spend_inr - a.spend_inr);
  return { window: 'last_7d', ads: rows.slice(0, 25) };
}
async function get_pipeline(ctx: CeoCtx) {
  const supa = supabaseAdmin();
  for (const tbl of ['leads', 'leads_log']) {
    try {
      const { data, error } = await supa.from(tbl).select('stage,status,created_at').eq('tenant_id', ctx.tenantId).limit(2000);
      if (error || !data) continue;
      const byStage: any = {}; let recent7 = 0; const wk = Date.now() - 7 * 864e5;
      for (const r of data as any[]) { const s = r.stage || r.status || 'unknown'; byStage[s] = (byStage[s] || 0) + 1; if (r.created_at && new Date(r.created_at).getTime() > wk) recent7++; }
      return { source: tbl, total: data.length, by_stage: byStage, new_last_7d: recent7 };
    } catch { /* try next */ }
  }
  return { note: 'No lead pipeline data found yet (no leads table populated).' };
}
async function engine_health(ctx: CeoCtx) {
  const supa = supabaseAdmin();
  try {
    const { data } = await supa.from('ceo_observations').select('*').eq('tenant_id', ctx.tenantId).order('observed_at', { ascending: false }).limit(15);
    const rows = (data || []) as any[];
    const open = rows.filter((o) => !o.resolved);
    return { open_issues: open.length, observations: rows.slice(0, 10).map((o) => ({ kind: o.observation_kind || o.kind, severity: o.severity, title: o.title || o.summary, resolved: !!o.resolved, when: o.observed_at })) };
  } catch { return { note: 'No observations yet / no recent CEO scan.' }; }
}

async function recent_plans(ctx: CeoCtx) {
  const supa = supabaseAdmin();
  try {
    const { data } = await supa.from('marketing_plans').select('id,brand,status,created_at,brief_id').eq('tenant_id', ctx.tenantId).order('id', { ascending: false }).limit(8);
    const plans = [];
    for (const p of (data || []) as any[]) {
      const { count } = await supa.from('creative_assets').select('id', { count: 'exact', head: true }).eq('plan_id', p.id);
      plans.push({ plan_id: p.id, brand: p.brand, status: p.status, creatives: count || 0, when: p.created_at });
    }
    return { plans };
  } catch { return { plans: [], note: 'no plans table / none yet' }; }
}

async function execReadTool(name: string, args: any, ctx: CeoCtx): Promise<any> {
  switch (name) {
    case 'audit_campaigns': return audit_campaigns(ctx);
    case 'list_campaigns': return list_campaigns(ctx, args);
    case 'campaign_quality': return campaign_quality(ctx);
    case 'get_pipeline': return get_pipeline(ctx);
    case 'engine_health': return engine_health(ctx);
    case 'recent_plans': return recent_plans(ctx);
    default: return { error: 'unknown tool ' + name };
  }
}

// ---------- WRITE action executor (only after approval) ----------
export async function executeAction(p: { action: string; campaign_id?: string; daily_inr?: number; goal?: string; brand?: string; vertical?: string; geo?: string; days?: number; plan_id?: number }, ctx: CeoCtx): Promise<{ ok: boolean; detail: string }> {
  try {
    // ---- generate a new campaign (strategy + creatives) via orchestrator #86 ----
    if (p.action === 'generate_campaign') {
      const controller = new AbortController(); const t = setTimeout(() => controller.abort(), 55000);
      try {
        const r = await fetch(`${ctx.n8nBase}/webhook/vametrix-86-orchestrate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal: p.goal, brand: p.brand || 'mixed', vertical: p.vertical || null, target_geo: p.geo || 'Pan-India', budget_inr_daily: p.daily_inr || null, timeline_days: p.days || 30 }),
          signal: controller.signal,
        });
        clearTimeout(t);
        const j = await r.json().catch(() => ({}));
        if (j && j.plan_id) return { ok: true, detail: `Generated plan #${j.plan_id} with ${Array.isArray(j.assets) ? j.assets.length : 0} creatives — ready to push to Meta.` };
        return { ok: true, detail: 'Campaign is generating (strategy + creatives). Ask me to check recent plans in ~90s, then push it to Meta.' };
      } catch { clearTimeout(t); return { ok: true, detail: 'Campaign is generating in the background (~1-2 min). Ask me to list recent plans shortly, then push the new one to Meta.' }; }
    }
    // ---- push an existing plan live to Meta (PAUSED) via launcher #90 ----
    if (p.action === 'push_campaign_to_meta') {
      if (!p.plan_id) return { ok: false, detail: 'plan_id required' };
      const r = await fetch(`${ctx.n8nBase}/webhook/vametrix-90-launch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_id: p.plan_id }) });
      const j = await r.json().catch(() => ({}));
      const cid = j && (j.campaign_id || (j.summary && j.summary.campaign_id));
      if (cid) return { ok: true, detail: `Built campaign ${cid} on Meta (PAUSED). Review it, then say "activate" when ready.` };
      if (j && j.summary && j.summary.ad_error) return { ok: false, detail: `Launch blocked: ${j.summary.ad_error}` };
      return { ok: true, detail: 'Launch fired — building the PAUSED campaign on Meta. Check campaigns in a moment.' };
    }
    // ---- live campaign edits via Meta Graph ----
    let body: any = {};
    if (p.action === 'pause_campaign') body = { status: 'PAUSED' };
    else if (p.action === 'activate_campaign') body = { status: 'ACTIVE' };
    else if (p.action === 'set_daily_budget') { if (!p.daily_inr) return { ok: false, detail: 'daily_inr required' }; body = { daily_budget: Math.round(p.daily_inr * 100) }; }
    else return { ok: false, detail: 'unsupported action ' + p.action };
    if (!p.campaign_id) return { ok: false, detail: 'campaign_id required' };
    const r = await fetch(`${GRAPH}/${p.campaign_id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, access_token: ctx.metaToken }) });
    const j = await r.json();
    if (j.error) return { ok: false, detail: j.error.error_user_title || j.error.message };
    return { ok: true, detail: `${p.action.replace(/_/g, ' ')} done on ${p.campaign_id}` };
  } catch (e: any) { return { ok: false, detail: String(e?.message || e) }; }
}

// ---------- The agent loop ----------
export async function runCeoTurn(history: ChatMsg[], ctx: CeoCtx): Promise<{ reply: string; proposals: Proposal[] }> {
  const messages: any[] = [{ role: 'system', content: SYSTEM }, ...history.map(m => ({ role: m.role, content: m.content, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}), ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}), ...(m.name ? { name: m.name } : {}) }))];
  const proposals: Proposal[] = [];
  let pid = 0;

  for (let iter = 0; iter < 6; iter++) {
    const resp = await fetch(`${ctx.orBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + ctx.orKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://vametrix.com', 'X-Title': 'Vametrix CEO' },
      body: JSON.stringify({ model: ctx.model, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.3, max_tokens: 1500 }),
    });
    const data = await resp.json();
    if (data.error) return { reply: `⚠️ CEO brain error: ${data.error.message || JSON.stringify(data.error).slice(0, 200)}`, proposals };
    const msg = data.choices?.[0]?.message;
    if (!msg) return { reply: '⚠️ No response from the CEO brain.', proposals };

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      return { reply: msg.content || '(no reply)', proposals };
    }

    // append the assistant turn (with tool_calls) then resolve each tool
    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: toolCalls });
    for (const tc of toolCalls) {
      let args: any = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      if (tc.function.name === 'propose_action') {
        const id = `p${++pid}`;
        let label = (args.action || '').replace(/_/g, ' ');
        if (args.action === 'generate_campaign') label = `Generate ${args.brand || ''} campaign${args.geo ? ' · ' + args.geo : ''}${args.daily_inr ? ' · ₹' + args.daily_inr + '/day' : ''}`;
        else if (args.action === 'push_campaign_to_meta') label = `Build plan #${args.plan_id} on Meta (PAUSED)`;
        else label = `${label}${args.campaign_name ? ' — ' + args.campaign_name : ''}${args.daily_inr ? ' → ₹' + args.daily_inr + '/day' : ''}`;
        proposals.push({ id, action: args.action, args: { campaign_id: args.campaign_id, daily_inr: args.daily_inr, campaign_name: args.campaign_name, goal: args.goal, brand: args.brand, vertical: args.vertical, geo: args.geo, days: args.days, plan_id: args.plan_id }, label, reason: args.reason || '' });
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ proposed: true, note: 'Shown to user for approval. Do not repeat it; continue or summarize.' }) });
      } else {
        const result = await execReadTool(tc.function.name, args, ctx);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result).slice(0, 8000) });
      }
    }
  }
  return { reply: 'I gathered the data but hit my reasoning step limit — ask me to continue.', proposals };
}
