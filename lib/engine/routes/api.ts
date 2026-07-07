// HTTP surface of the engine. Tenant is always explicit (?org=<slug>).
import { Hono } from 'hono';
import { envOr } from '../lib/env';
import { orgBySlug, orgChannel } from '../kernel/tenants';
import { ingestLead, type IngestPayload } from '../modules/sales/ingest';
import { loadDocument, searchKb } from '../modules/sales/kb';
import { respond } from '../modules/sales/agent';
import { processWhatsappEvent } from '../modules/sales/inbound';
import {
  ensureConversation, logEvent, openLeadFor, createLead, storeMessage, upsertContact, normalizePhone,
} from '../kernel/crm';
import { db } from '../lib/db';

export const api = new Hono();

api.get('/health', c => c.json({ ok: true, service: 'vametrix-engine', ts: new Date().toISOString() }));

// â”€â”€ S-01: lead ingestion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
api.post('/ingest/lead', async c => {
  const slug = c.req.query('org');
  if (!slug) return c.json({ error: 'missing ?org=' }, 400);
  const org = await orgBySlug(slug);
  const payload = (await c.req.json()) as IngestPayload;
  if (!payload.phone || !payload.source) return c.json({ error: 'phone and source are required' }, 400);
  const result = await ingestLead(org, payload);
  return c.json(result);
});

// â”€â”€ S-05: knowledge base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
api.post('/kb/load', async c => {
  const slug = c.req.query('org');
  if (!slug) return c.json({ error: 'missing ?org=' }, 400);
  const org = await orgBySlug(slug);
  const body = await c.req.json();
  if (!body.title || !body.content) return c.json({ error: 'title and content are required' }, 400);
  const result = await loadDocument(org, body);
  return c.json(result);
});

api.post('/kb/search', async c => {
  const slug = c.req.query('org');
  if (!slug) return c.json({ error: 'missing ?org=' }, 400);
  const org = await orgBySlug(slug);
  const { query } = await c.req.json();
  return c.json({ results: await searchKb(org.id, query) });
});

// â”€â”€ DEV ONLY: simulate an inbound message and get the AI's reply â”€â”€
// Full agent pipeline without WhatsApp: contactâ†’leadâ†’conversationâ†’brain.
// Disabled when ENGINE_ENV=prod.
api.post('/dev/simulate-inbound', async c => {
  if (envOr('ENGINE_ENV', 'dev') === 'prod') return c.json({ error: 'disabled in prod' }, 403);
  const slug = c.req.query('org');
  if (!slug) return c.json({ error: 'missing ?org=' }, 400);
  const org = await orgBySlug(slug);
  const { phone, text, name } = await c.req.json();
  if (!phone || !text) return c.json({ error: 'phone and text are required' }, 400);

  const contact = await upsertContact(org.id, { phone, full_name: name });
  let lead = await openLeadFor(org.id, contact.id);
  if (!lead) {
    const created = await createLead(org.id, contact.id, 'whatsapp_inbound', { simulated: true });
    lead = { id: created.id, status: 'new' };
  }
  const conversation = await ensureConversation(org.id, contact.id, lead.id, null);
  await storeMessage(org.id, conversation.id, {
    direction: 'inbound', sender: 'contact', content_type: 'text', body: text,
  });
  if (conversation.status === 'handed_off') {
    return c.json({ reply: null, note: 'conversation is handed off to a human â€” AI stays silent' });
  }
  const reply = await respond(org, contact.id, lead.id, conversation.id);
  return c.json({ reply, leadId: lead.id });
});

// â”€â”€ S-02 entry: WhatsApp Cloud API webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GET = Meta verification handshake
api.get('/webhooks/whatsapp', c => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  if (mode === 'subscribe' && token === envOr('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN', '')) {
    return c.text(challenge ?? '');
  }
  return c.text('forbidden', 403);
});

// POST = inbound messages/statuses. v0: fast-ack + store; the agent loop
// (modules/sales/agent) picks up from stored inbound messages.
api.post('/webhooks/whatsapp', async c => {
  const slug = c.req.query('org') ?? 'befach';
  const body = await c.req.json();
  // Ack fast; process without blocking Meta's 10s timeout.
  queueMicrotask(async () => {
    try {
      await processWhatsappEvent(slug, body);
    } catch (e) {
      console.error('whatsapp webhook processing failed:', (e as Error).message);
    }
  });
  return c.json({ received: true });
});
