// Inbound queue poller â€” drains WhatsApp events that the n8n relay dropped
// into sales_inbound_queue. 3s tick: near-realtime replies without the engine
// needing a public URL. Atomic claim (FOR UPDATE SKIP LOCKED) keeps multiple
// engine instances safe.
import { db } from '../lib/db';
import { processWhatsappEvent } from '../modules/sales/inbound';

const POLL_MS = 1_500;

/** First customer phone in a WhatsApp event â€” used to serialize per contact. */
function eventPhone(payload: any): string {
  return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ?? 'unknown';
}

export function startInboundQueuePoller(): void {
  console.log(`[inbound-queue] poller active (every ${POLL_MS / 1000}s, parallel per contact)`);
  let running = false;
  setInterval(async () => {
    if (running) return; // never overlap ticks
    running = true;
    try {
      const { data: claimed, error } = await db.rpc('sales_claim_inbound', { p_limit: 10 });
      if (error) throw new Error(error.message);

      // Different contacts process in PARALLEL (one slow agent turn no longer
      // blocks everyone); messages from the SAME contact stay serial (ordering).
      const groups = new Map<string, any[]>();
      for (const row of claimed ?? []) {
        const key = `${row.org_slug}:${eventPhone(row.payload)}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
      }
      await Promise.all([...groups.values()].map(async rows => {
        for (const row of rows) {
          try {
            await processWhatsappEvent(row.org_slug, row.payload);
            await db.from('sales_inbound_queue')
              .update({ status: 'processed', processed_at: new Date().toISOString() })
              .eq('id', row.id);
          } catch (e) {
            await db.from('sales_inbound_queue')
              .update({ status: 'failed', error: (e as Error).message.slice(0, 500) })
              .eq('id', row.id);
            console.error(`[inbound-queue] event ${row.id} failed:`, (e as Error).message);
          }
        }
      }));
    } catch (e) {
      console.error('[inbound-queue] tick failed:', (e as Error).message);
    } finally {
      running = false;
    }
  }, POLL_MS);
}


/** Drain pending inbound events once (serverless webhook/cron path). */
export async function inboundDrainOnce(): Promise<number> {
  const { data: claimed, error } = await db.rpc('sales_claim_inbound', { p_limit: 10 });
  if (error) throw new Error(error.message);
  const groups = new Map<string, any[]>();
  for (const row of claimed ?? []) {
    const key = `${row.org_slug}:${eventPhone(row.payload)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }
  await Promise.all([...groups.values()].map(async rows => {
    for (const row of rows) {
      try {
        await processWhatsappEvent(row.org_slug, row.payload);
        await db.from('sales_inbound_queue')
          .update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', row.id);
      } catch (e) {
        await db.from('sales_inbound_queue')
          .update({ status: 'failed', error: (e as Error).message.slice(0, 500) }).eq('id', row.id);
      }
    }
  }));
  return (claimed ?? []).length;
}