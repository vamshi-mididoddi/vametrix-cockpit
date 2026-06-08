'use server';

import { requireAuth } from '@/lib/auth';
import { getCurrentTenantId, getTenantCredentials } from '@/lib/tenant';
import { runCeoTurn, executeAction, type ChatMsg, type CeoCtx, type Proposal } from '@/lib/ceo-agent';

async function buildCtx(): Promise<CeoCtx | { error: string }> {
  const tenantId = await getCurrentTenantId();
  const [or, meta, n8n] = await Promise.all([
    getTenantCredentials(tenantId, 'openrouter'),
    getTenantCredentials(tenantId, 'meta_ads'),
    getTenantCredentials(tenantId, 'n8n'),
  ]);
  const orKey = or.api_key || process.env.OPENROUTER_API_KEY || '';
  const metaToken = meta.access_token || process.env.META_ACCESS_TOKEN || '';
  const adAccount = (meta.ad_account_id || process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
  if (!orKey) return { error: 'OpenRouter key not configured for this tenant.' };
  if (!metaToken || !adAccount) return { error: 'Meta ad credentials not configured for this tenant.' };
  return {
    orKey,
    orBase: or.base_url || 'https://openrouter.ai/api/v1',
    // CEO reasons but runs many tool loops — Sonnet is the cost/quality sweet spot
    // (premium tier). Opus (reasoning_model) is overkill + ~5x the cost for a chat.
    model: or.premium_model || or.default_model || 'anthropic/claude-sonnet-4.6',
    metaToken, adAccount, tenantId,
    n8nBase: (n8n.base_url || process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud').replace(/\/$/, ''),
    n8nKey: n8n.api_key || process.env.N8N_API_KEY || '',
  };
}

export async function ceoChat(history: ChatMsg[], userText: string): Promise<{ ok: boolean; reply?: string; proposals?: Proposal[]; error?: string }> {
  await requireAuth();
  if (!userText?.trim()) return { ok: false, error: 'empty message' };
  const ctx = await buildCtx();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  try {
    // keep only user/assistant text turns (cap history to last 16 for token economy)
    const clean = (history || []).filter(m => m.role === 'user' || m.role === 'assistant').slice(-16);
    const { reply, proposals } = await runCeoTurn([...clean, { role: 'user', content: userText.trim() }], ctx);
    return { ok: true, reply, proposals };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function approveCeoAction(action: string, args: { campaign_id: string; daily_inr?: number; campaign_name?: string }): Promise<{ ok: boolean; detail: string }> {
  await requireAuth();
  const ctx = await buildCtx();
  if ('error' in ctx) return { ok: false, detail: ctx.error };
  return executeAction({ action, campaign_id: args.campaign_id, daily_inr: args.daily_inr }, ctx);
}
