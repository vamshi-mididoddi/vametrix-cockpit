// Telegram webhook → Vametrix CEO. Same brain as the website chat (lib/ceo-agent).
// Founder messages @vametrix_engine_bot → CEO reasons + uses tools → replies.
// Spend/launch actions come back as inline Approve / Cancel buttons.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTenantCredentials } from '@/lib/tenant';
import { DEFAULT_TENANT_ID } from '@/lib/auth';
import { runCeoTurn, executeAction, type CeoCtx, type ChatMsg } from '@/lib/ceo-agent';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function tg(token: string, method: string, body: any) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch { /* best-effort */ }
}
const clean = (t: string) => (t || '').replace(/\*\*/g, '').slice(0, 3900);

async function buildCtx(): Promise<CeoCtx | null> {
  const tid = DEFAULT_TENANT_ID;
  const [or, meta, n8n] = await Promise.all([
    getTenantCredentials(tid, 'openrouter'),
    getTenantCredentials(tid, 'meta_ads'),
    getTenantCredentials(tid, 'n8n'),
  ]);
  if (!or.api_key || !meta.access_token) return null;
  return {
    orKey: or.api_key, orBase: or.base_url || 'https://openrouter.ai/api/v1',
    model: or.premium_model || or.default_model || 'anthropic/claude-sonnet-4.6',
    metaToken: meta.access_token, adAccount: (meta.ad_account_id || '').replace(/^act_/, ''),
    n8nBase: (n8n.base_url || 'https://n8n.srv1048087.hstgr.cloud').replace(/\/$/, ''), n8nKey: n8n.api_key || '',
    tenantId: tid,
  };
}

export async function POST(req: NextRequest) {
  const tel = await getTenantCredentials(DEFAULT_TENANT_ID, 'telegram');
  const token = tel.bot_token; const authChat = String(tel.chat_id || ''); const secret = tel.webhook_secret;
  if (!token) return NextResponse.json({ ok: true });
  // verify Telegram secret header if configured
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) return NextResponse.json({ ok: true });

  let update: any;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const supa = supabaseAdmin();

  // ---- inline button tap (approve / cancel) ----
  if (update.callback_query) {
    const cq = update.callback_query;
    const chat = String(cq.message?.chat?.id || '');
    await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id });
    if (authChat && chat !== authChat) return NextResponse.json({ ok: true });
    const [verb, pidStr] = String(cq.data || '').split(':');
    const { data: pa } = await supa.from('ceo_pending_actions').select('*').eq('id', Number(pidStr)).maybeSingle();
    if (!pa || (pa as any).status !== 'pending') { await tg(token, 'sendMessage', { chat_id: chat, text: 'That action is no longer pending.' }); return NextResponse.json({ ok: true }); }
    if (verb === 'x') {
      await supa.from('ceo_pending_actions').update({ status: 'cancelled' }).eq('id', (pa as any).id);
      await tg(token, 'sendMessage', { chat_id: chat, text: '✖️ Cancelled — nothing changed.' });
      return NextResponse.json({ ok: true });
    }
    const ctx = await buildCtx();
    if (!ctx) { await tg(token, 'sendMessage', { chat_id: chat, text: '⚠️ Engine credentials missing.' }); return NextResponse.json({ ok: true }); }
    const res = await executeAction({ action: (pa as any).action, ...((pa as any).args || {}) }, ctx);
    await supa.from('ceo_pending_actions').update({ status: res.ok ? 'approved' : 'failed', result: res.detail }).eq('id', (pa as any).id);
    await tg(token, 'sendMessage', { chat_id: chat, text: (res.ok ? '✅ ' : '⚠️ ') + res.detail });
    return NextResponse.json({ ok: true });
  }

  // ---- text message ----
  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });
  const chat = String(msg.chat?.id || '');
  if (authChat && chat !== authChat) { await tg(token, 'sendMessage', { chat_id: chat, text: 'This is a private Vametrix engine. You are not authorized.' }); return NextResponse.json({ ok: true }); }
  const text = msg.text.trim();
  if (text === '/start' || text === '/help') {
    await tg(token, 'sendMessage', { chat_id: chat, text: "👋 I'm Vametrix CEO. Ask me anything about your sales + marketing engine — \"how are my campaigns doing\", \"what's wasting money\", \"run a Dcal dealer campaign in Hyderabad ₹300/day\", \"show my pipeline\". Actions that spend money I'll send you to approve with a button." });
    return NextResponse.json({ ok: true });
  }

  await tg(token, 'sendChatAction', { chat_id: chat, action: 'typing' });
  const { data: sess } = await supa.from('ceo_chat_sessions').select('messages').eq('chat_id', chat).maybeSingle();
  const history: ChatMsg[] = (((sess as any)?.messages) || []).filter((m: any) => m.role === 'user' || m.role === 'assistant').slice(-16);

  const ctx = await buildCtx();
  if (!ctx) { await tg(token, 'sendMessage', { chat_id: chat, text: '⚠️ Engine credentials not configured.' }); return NextResponse.json({ ok: true }); }

  let reply = ''; let proposals: any[] = [];
  try { const r = await runCeoTurn([...history, { role: 'user', content: text }], ctx); reply = r.reply; proposals = r.proposals; }
  catch (e: any) { reply = '⚠️ ' + String(e?.message || e); }

  const newMsgs = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-16);
  await supa.from('ceo_chat_sessions').upsert({ chat_id: chat, tenant_id: DEFAULT_TENANT_ID, messages: newMsgs, updated_at: new Date().toISOString() }, { onConflict: 'chat_id' });

  await tg(token, 'sendMessage', { chat_id: chat, text: clean(reply) });
  for (const p of proposals) {
    const { data: ins } = await supa.from('ceo_pending_actions').insert({ chat_id: chat, tenant_id: DEFAULT_TENANT_ID, action: p.action, args: p.args, label: p.label, status: 'pending' }).select('id').single();
    if (ins) await tg(token, 'sendMessage', { chat_id: chat, text: '⚠️ ' + p.label + (p.reason ? '\n' + p.reason : ''), reply_markup: { inline_keyboard: [[{ text: '✅ Approve', callback_data: 'a:' + (ins as any).id }, { text: '✖️ Cancel', callback_data: 'x:' + (ins as any).id }]] } });
  }
  return NextResponse.json({ ok: true });
}

// Telegram doesn't GET this, but health-check friendliness:
export async function GET() { return NextResponse.json({ ok: true, service: 'vametrix-ceo-telegram' }); }
