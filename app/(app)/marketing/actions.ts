'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const N8N_BASE = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';

type R = { ok: boolean; error?: string; [k: string]: any };

// ---- Submit a brief (writes row, kicks off Strategist) ----
export async function submitBrief(input: {
  goal: string;
  brand?: string;
  vertical?: string;
  target_geo?: string;
  target_persona?: string;
  budget_inr_daily?: number;
  budget_inr_total?: number;
  timeline_days?: number;
  notes?: string;
}): Promise<R> {
  const u = await requireAdmin();
  if (!input.goal?.trim()) return { ok: false, error: 'Goal is required' };
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.from('marketing_briefs').insert({
      submitted_by: u.id,
      goal: input.goal.trim(),
      brand: input.brand || 'mixed',
      vertical: input.vertical || null,
      target_geo: input.target_geo || 'Pan-India',
      target_persona: input.target_persona || null,
      budget_inr_daily: input.budget_inr_daily || null,
      budget_inr_total: input.budget_inr_total || null,
      timeline_days: input.timeline_days || 30,
      notes: input.notes || null,
      status: 'received',
    }).select('*').single();

    if (error) return { ok: false, error: error.message };

    // Fire strategist webhook (async, do not wait long)
    const fire = fetch(`${N8N_BASE}/webhook/vametrix-87-strategist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief_id: data.id,
        goal: data.goal,
        brand: data.brand,
        vertical: data.vertical,
        target_geo: data.target_geo,
        target_persona: data.target_persona,
        budget_inr_daily: data.budget_inr_daily,
        budget_inr_total: data.budget_inr_total,
        timeline_days: data.timeline_days,
        notes: data.notes,
      }),
    }).catch(e => console.error('strategist webhook err', e));

    // Don't await — strategist is async. UI polls /marketing for updates.
    void fire;

    revalidatePath('/marketing');
    return { ok: true, brief_id: data.id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Generate creatives for a plan ----
export async function generateCreatives(plan_id: number, variant_count?: number): Promise<R> {
  await requireAdmin();
  if (!plan_id) return { ok: false, error: 'plan_id required' };
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-88-creative-factory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id, variant_count: variant_count || null }),
    });
    if (!r.ok) return { ok: false, error: `factory http ${r.status}` };
    const out = await r.json();
    revalidatePath('/marketing');
    return { ok: true, ...out };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Approve/Reject creative asset ----
export async function approveAsset(asset_id: number, approve: boolean, reason?: string): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('creative_assets').update({
      approval_status: approve ? 'approved' : 'rejected',
      approved_by: approve ? u.id : null,
      approved_at: approve ? new Date().toISOString() : null,
      rejection_reason: !approve ? (reason || 'rejected by admin') : null,
    }).eq('id', asset_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/marketing');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Approve plan ----
export async function approvePlan(plan_id: number): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('marketing_plans').update({
      approval_status: 'approved',
      approved_by: u.id,
      approved_at: new Date().toISOString(),
    }).eq('id', plan_id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/marketing');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Push plan to Meta (draft, PAUSED) ----
export async function pushToMeta(plan_id: number): Promise<R> {
  const u = await requireAdmin();
  if (!plan_id) return { ok: false, error: 'plan_id required' };
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-90-launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id, platform: 'meta', initiated_by: u.id }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `launcher http ${r.status}: ${t.slice(0, 200)}` };
    }
    const out = await r.json();
    revalidatePath('/marketing');
    return { ok: true, ...out };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Activate a paused Meta launch ----
export async function activateLaunch(campaign_id: string, plan_id?: number): Promise<R> {
  const u = await requireAdmin();
  if (!campaign_id) return { ok: false, error: 'campaign_id required' };
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-90-activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id, plan_id, approved_by: u.id }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `activate http ${r.status}: ${t.slice(0, 200)}` };
    }
    const out = await r.json();
    revalidatePath('/marketing');
    return { ok: true, ...out };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Kill a campaign ----
export async function killLaunch(campaign_id: string, reason: string): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('ad_launches').update({
      state: 'killed',
      killed_at: new Date().toISOString(),
      killed_reason: reason,
    }).eq('campaign_id', campaign_id);
    if (error) return { ok: false, error: error.message };
    // Also pause in Meta — caller can do that via /vametrix-90-kill later
    revalidatePath('/marketing');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- One-click full campaign generation (brief → plan → creatives in one call) ----
// Calls [VAMETRIX] 86 - Campaign Orchestrator which chains #87 + #88 internally.
// Returns the complete package: brief_id, plan_id, plan, asset_ids, assets.
// Synchronous — UI shows a spinner for ~60-180s while LLM + image gen runs.
export async function oneClickCampaign(input: {
  goal: string;
  brand?: string;
  vertical?: string;
  target_geo?: string;
  target_persona?: string;
  budget_inr_daily?: number;
  budget_inr_total?: number;
  timeline_days?: number;
  notes?: string;
}): Promise<R> {
  const u = await requireAdmin();
  if (!input.goal?.trim() || input.goal.trim().length < 5) {
    return { ok: false, error: 'Goal must be at least 5 characters.' };
  }
  // The orchestrator runs the full strategist + creative-factory chain (~2-3 min)
  // SERVER-SIDE in n8n. A Vercel server action can't block that long (function
  // time limit), so we KICK IT OFF and return "generating" immediately. n8n keeps
  // running after we disconnect; the plan + creatives appear on /marketing as they
  // finish. This is the reliable pattern for long background work behind a webhook.
  const payload = JSON.stringify({
    goal: input.goal.trim(),
    brand: input.brand || 'mixed',
    vertical: input.vertical || null,
    target_geo: input.target_geo || 'Pan-India',
    target_persona: input.target_persona || null,
    budget_inr_daily: input.budget_inr_daily || null,
    budget_inr_total: input.budget_inr_total || null,
    timeline_days: input.timeline_days || 30,
    notes: input.notes || null,
    submitted_by: u.id,
  });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000); // just confirm it started
    try {
      const r = await fetch(`${N8N_BASE}/webhook/vametrix-86-orchestrate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // Rare: if it finished fast with a full body, surface it directly.
      const out = await r.json().catch(() => null);
      if (out && out.ok && out.plan_id) {
        revalidatePath('/marketing');
        return { ok: true, brief_id: out.brief_id, plan_id: out.plan_id, asset_count: Array.isArray(out.assets) ? out.assets.length : 0 };
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name !== 'AbortError') throw e; // AbortError = expected (still running server-side)
    }
    revalidatePath('/marketing');
    return { ok: true, generating: true, message: 'Campaign is generating — strategy + creatives take ~2-3 min. They will appear below; refresh shortly.' };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ---- Run tech audit on-demand ----
export async function runTechAudit(): Promise<R> {
  await requireAdmin();
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-89-tech-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on_demand: true }),
    });
    if (!r.ok) return { ok: false, error: `audit http ${r.status}` };
    revalidatePath('/tech-audit');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
