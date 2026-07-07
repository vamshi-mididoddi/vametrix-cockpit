// VAMETRIX engine on Vercel — the whole Hono engine mounted under /api/engine.
// Webhook: /api/engine/webhooks/whatsapp · Admin: /api/engine/admin/* ·
// Cron tick: /api/engine/jobs/tick (fires follow-ups, drains inbound queue,
// sweeps leadgen forms — call it every minute from n8n or Vercel cron).
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { api } from '@/lib/engine/routes/api';
import { admin } from '@/lib/engine/routes/admin';
import { followupsTickOnce } from '@/lib/engine/jobs/followups';
import { inboundDrainOnce } from '@/lib/engine/jobs/inboundQueue';
import { leadgenTickOnce } from '@/lib/engine/jobs/leadgenPoller';
import { envOr } from '@/lib/engine/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 60; // agent turns take 8-20s; webhook processes inline
export const dynamic = 'force-dynamic';

const app = new Hono().basePath('/api/engine');
app.route('/', api);
app.route('/admin', admin);

app.get('/jobs/tick', async c => {
  const auth = c.req.header('authorization') ?? '';
  const keyOk = c.req.header('x-admin-key') === envOr('ENGINE_ADMIN_KEY', '');
  const cronOk = envOr('CRON_SECRET', '') && auth === `Bearer ${envOr('CRON_SECRET', '')}`;
  if (!keyOk && !cronOk) return c.json({ error: 'unauthorized' }, 401);
  const [followups, inbound] = await Promise.all([followupsTickOnce(), inboundDrainOnce()]);
  await leadgenTickOnce();
  return c.json({ ok: true, followups_sent: followups, inbound_processed: inbound, ts: new Date().toISOString() });
});

app.onError((err, c) => {
  console.error(`[engine] ${c.req.method} ${c.req.path}:`, err.message);
  return c.json({ error: err.message }, 500);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);