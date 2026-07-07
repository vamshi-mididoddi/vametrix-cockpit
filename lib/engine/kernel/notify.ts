// Operator notifications. v0: Telegram (platform-level bot from .env).
// Phase 1: per-tenant notification channels from org config.
import { envOr } from '../lib/env';

export async function notifyOperator(text: string): Promise<void> {
  const token = envOr('TELEGRAM_BOT_TOKEN', '');
  const chatId = envOr('TELEGRAM_CHAT_ID', '');
  if (!token || !chatId) {
    console.warn('[notify] telegram not configured; message:', text.slice(0, 200));
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.error('[notify] telegram send failed:', (e as Error).message);
  }
}
