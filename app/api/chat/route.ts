// PUBLIC website chat for vametrix.com — visitors talk to the Vametrix AI (this IS the demo).
// Safe by design: NO engine-control tools (can't pause campaigns, log in, or touch accounts),
// cheap model (gemini-2.5-flash), rate-limited per IP + hard session cap, captures interested
// visitors into leads_log so the team can follow up. Multilingual (matches the visitor).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTenantCredentials } from '@/lib/tenant';
import { DEFAULT_TENANT_ID } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Best-effort in-memory IP throttle (resets on cold start; backed by the hard session cap
// + a cheap model + short max_tokens, so cost stays bounded even without a persistent store).
const HITS: Map<string, number[]> = (globalThis as any).__vmxChatHits || ((globalThis as any).__vmxChatHits = new Map());
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 24;
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) { for (const [k, v] of HITS) if (!v.some((t) => now - t < WINDOW_MS)) HITS.delete(k); }
  return arr.length > MAX_PER_WINDOW;
}

const SYSTEM = `You are Vametrix — the live AI brain of the Vametrix Engine, talking to a visitor on vametrix.com right now. This conversation IS the product demo: they are experiencing the same engine that runs sales & marketing for real businesses.

WHAT VAMETRIX IS — an autonomous, multi-agent AI sales & marketing engine that doesn't just assist, it operates:
- Catches AND hunts leads — answers inbound WhatsApp instantly, and auto-discovers ideal-customer businesses to reach out to.
- Qualifies every lead on WhatsApp in 3–5 messages, 24/7, in their own language (English, Hindi, Hinglish, Telugu — auto-detected).
- Runs paid ads (Meta/Google) end-to-end: strategy, creatives, launch, daily optimisation — like a performance marketer that never sleeps.
- Auto follows up, routes hot leads to the team, and tracks everything in a built-in CRM.
- A conversational "CEO" layer lets the founder run the whole engine by chat — exactly like this.
It's live today for Befach International (a Hyderabad importer) and brands like D'Cal — handling real WhatsApp leads from first hello to qualified handoff.

YOUR JOB IN THIS CHAT:
1. Be genuinely useful and sharp — answer what they ask, clearly and confidently. You're a senior operator, not a brochure. Your own crispness is the pitch.
2. Steer naturally toward their world: what's their business? what's their biggest sales or marketing bottleneck? Then connect it to exactly what Vametrix would do about it.
3. When there's real interest, ask for their name + WhatsApp number (or email) so the Vametrix team can set up a demo. Frame it as the obvious next step, never a hard sell.
4. Match their language. If they write in Hindi/Hinglish/Telugu, reply the same way.

RULES:
- 2–5 sentences per reply. This is a chat, not an essay. Move the conversation forward each turn; never repeat your intro.
- Never invent pricing, fake clients, or features that don't exist. If they push for an exact number you're unsure of, say the team will share precise details on a quick call.
- You are the front-door conversation only — you CANNOT log in, change campaigns, or access anyone's accounts. Never claim you performed an action.
- If asked something off-topic or adversarial, warmly redirect to how Vametrix can help their business.`;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?91[\-\s]?)?[6-9]\d{9}/;

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }
  const rawMsgs: any[] = Array.isArray(body.messages) ? body.messages : [];
  const sessionId = String(body.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'anon';

  if (rawMsgs.length > 40) {
    return NextResponse.json({ reply: "We've covered a lot here! Drop your WhatsApp number or email and the Vametrix team will pick it up personally. 🙌" });
  }
  if (rateLimited(ip)) {
    return NextResponse.json({ reply: "You're going quick 🙂 give it a few seconds — or leave your WhatsApp/email and we'll reach out." });
  }

  const or = await getTenantCredentials(DEFAULT_TENANT_ID, 'openrouter');
  if (!or.api_key) return NextResponse.json({ reply: 'Chat is warming up — please try again in a moment.' });
  const model = or.default_model || 'google/gemini-2.5-flash';

  const hist = rawMsgs.slice(-16).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  })).filter((m) => m.content);

  let reply = '';
  try {
    const resp = await fetch((or.base_url || 'https://openrouter.ai/api/v1').replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + or.api_key, 'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vametrix.com', 'X-Title': 'Vametrix Website Chat',
      },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, ...hist], temperature: 0.5, max_tokens: 420 }),
    });
    const j = await resp.json();
    reply = (j?.choices?.[0]?.message?.content || '').trim();
  } catch { /* fall through to fallback */ }
  if (!reply) reply = "Sorry — I glitched for a second there. Ask me again, or leave your WhatsApp/email and the team will jump in.";

  // Lead capture: if the visitor shared a phone or email anywhere, log them so the team can follow up.
  try {
    const userText = rawMsgs.filter((m) => m.role === 'user').map((m) => String(m.content || '')).join('  \n  ');
    const email = (userText.match(EMAIL_RE) || [])[0] || null;
    const phoneM = (userText.match(PHONE_RE) || [])[0] || null;
    if (email || phoneM) {
      const phone = phoneM ? '+91' + phoneM.replace(/\D/g, '').slice(-10) : 'web_' + sessionId;
      const last = [...rawMsgs].reverse().find((m) => m.role === 'user')?.content || '';
      await supabaseAdmin().from('leads_log').upsert({
        phone, name: 'Website Visitor', source: 'website_chat', stage: 'engaged', score: 35, tenant_id: DEFAULT_TENANT_ID,
        meta: { channel: 'website_chat', email, session: sessionId, last_message: String(last).slice(0, 400), ip },
      }, { onConflict: 'phone' });
    }
  } catch { /* best-effort capture */ }

  return NextResponse.json({ reply });
}
