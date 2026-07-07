// WhatsApp Cloud API adapter (direct Meta, no BSP). The only file that knows
// Graph API shapes. Modules call sendText/sendTemplate and never see Meta.
import { whatsappCreds, type Channel } from '../tenants';

const GRAPH = 'https://graph.facebook.com';

async function graphPost(channel: Channel, body: object): Promise<{ messageId: string | null; raw: any }> {
  const { token, phoneNumberId, graphVersion } = await whatsappCreds(channel.org_id);
  const res = await fetch(`${GRAPH}/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`WA send failed ${res.status}: ${JSON.stringify(raw).slice(0, 300)}`);
  return { messageId: raw.messages?.[0]?.id ?? null, raw };
}

export async function sendText(channel: Channel, toPhone: string, text: string) {
  return graphPost(channel, {
    messaging_product: 'whatsapp',
    to: toPhone.replace(/^\+/, ''),
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

export async function sendTemplate(
  channel: Channel,
  toPhone: string,
  templateName: string,
  language: string,
  bodyParams: string[],
) {
  return graphPost(channel, {
    messaging_product: 'whatsapp',
    to: toPhone.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map(t => ({ type: 'text', text: t })) }]
        : [],
    },
  });
}

/** Resolve a media id from an inbound message to a downloadable URL + bytes. */
export async function downloadMedia(channel: Channel, mediaId: string): Promise<{ mime: string; base64: string }> {
  const { token, graphVersion } = await whatsappCreds(channel.org_id);
  const meta = await fetch(`${GRAPH}/${graphVersion}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  if (!meta.url) throw new Error(`media ${mediaId}: no url in metadata`);
  const bin = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!bin.ok) throw new Error(`media download failed ${bin.status}`);
  const buf = Buffer.from(await bin.arrayBuffer());
  return { mime: meta.mime_type ?? 'application/octet-stream', base64: buf.toString('base64') };
}
