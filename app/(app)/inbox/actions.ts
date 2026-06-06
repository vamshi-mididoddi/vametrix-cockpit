'use server';

const SEND_WEBHOOK = 'https://n8n.srv1048087.hstgr.cloud/webhook/vametrix-40-send-free-text';

export async function sendHumanMessage(phone: string, text: string): Promise<{ ok: boolean; error?: string; meta_message_id?: string | null }> {
  if (!phone || !text) return { ok: false, error: 'phone and text required' };
  try {
    const r = await fetch(SEND_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text, source: 'cockpit_human_takeover' }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 200)}` };
    }
    const j = await r.json().catch(() => ({}));
    return { ok: true, meta_message_id: j.meta_message_id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
