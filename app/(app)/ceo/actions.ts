'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { getCurrentTenantId, getTenantCredentials } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

const N8N_FALLBACK = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';

type R = { ok: boolean; error?: string; [k: string]: any };

// Resolve n8n base + API key from the tenant credential store (falls back to env).
async function n8n(): Promise<{ base: string; key: string }> {
  try {
    const tid = await getCurrentTenantId();
    const c = await getTenantCredentials(tid, 'n8n');
    const base = (c.base_url || N8N_FALLBACK).replace(/\/$/, '');
    const key = c.api_key || process.env.N8N_API_KEY || '';
    return { base, key };
  } catch {
    return { base: N8N_FALLBACK.replace(/\/$/, ''), key: process.env.N8N_API_KEY || '' };
  }
}

// ─────────────── Scan / digest (Stage 1 + 2) ───────────────
export async function runEyesNow(): Promise<R> {
  await requireAdmin();
  try {
    const { base } = await n8n();
    const r = await fetch(`${base}/webhook/vametrix-0a-eyes-ondemand`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) return { ok: false, error: `eyes http ${r.status}` };
    const out = await r.json().catch(() => ({}));
    revalidatePath('/ceo');
    return { ok: true, ...out };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function runVoiceNow(): Promise<R> {
  await requireAdmin();
  try {
    const { base } = await n8n();
    const r = await fetch(`${base}/webhook/vametrix-0b-voice-ondemand`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) return { ok: false, error: `voice http ${r.status}` };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function resolveObservation(id: number): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('ceo_observations').update({
      resolved: true, resolved_at: new Date().toISOString(), resolved_by: u.id,
    }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ─────────────── Stage 3: TROUBLESHOOT (Hands) ───────────────

// Inspect the last N executions of an agent's n8n workflow.
export async function getAgentExecutions(wfId: string): Promise<R> {
  await requireAdmin();
  if (!wfId) return { ok: false, error: 'No workflow id for this agent (it may not be deployed).' };
  try {
    const { base, key } = await n8n();
    if (!key) return { ok: false, error: 'n8n API key not configured for this tenant.' };
    const r = await fetch(`${base}/api/v1/executions?workflowId=${wfId}&limit=8`, {
      headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!r.ok) return { ok: false, error: `n8n executions ${r.status}` };
    const data = await r.json();
    const executions = (data.data || []).map((e: any) => ({
      id: e.id,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      mode: e.mode,
    }));
    return { ok: true, executions, n8n_url: `${base}/workflow/${wfId}` };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Restart a workflow: deactivate then reactivate. Fixes stuck triggers / cron drift.
export async function restartWorkflow(wfId: string): Promise<R> {
  await requireAdmin();
  if (!wfId) return { ok: false, error: 'No workflow id for this agent.' };
  try {
    const { base, key } = await n8n();
    if (!key) return { ok: false, error: 'n8n API key not configured for this tenant.' };
    const h = { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', Accept: 'application/json' };
    await fetch(`${base}/api/v1/workflows/${wfId}/deactivate`, { method: 'POST', headers: h });
    const r = await fetch(`${base}/api/v1/workflows/${wfId}/activate`, { method: 'POST', headers: h });
    if (!r.ok) return { ok: false, error: `reactivate ${r.status}` };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Agents that expose an on-demand webhook can be re-run immediately.
const RERUN_WEBHOOKS: Record<string, string> = {
  '0a': 'vametrix-0a-eyes-ondemand',
  '0b': 'vametrix-0b-voice-ondemand',
  '89': 'vametrix-89-tech-audit',
};

export async function rerunAgent(agentId: string): Promise<R> {
  await requireAdmin();
  const path = RERUN_WEBHOOKS[agentId];
  if (!path) {
    return { ok: false, error: 'This agent runs on a schedule or fires on events. Use Restart to re-arm its trigger.' };
  }
  try {
    const { base } = await n8n();
    const r = await fetch(`${base}/webhook/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!r.ok) return { ok: false, error: `run ${r.status}` };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Resolve ALL open observations at once (bulk troubleshoot clear).
export async function resolveAllObservations(): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const tid = await getCurrentTenantId();
    const { error } = await supa.from('ceo_observations').update({
      resolved: true, resolved_at: new Date().toISOString(), resolved_by: u.id,
    }).eq('tenant_id', tid).eq('resolved', false);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
