'use server';

import { supabaseAdmin } from '@/lib/supabase';

const SCHEDULE_WEBHOOK = 'https://n8n.srv1048087.hstgr.cloud/webhook/vametrix-43-schedule-reminder';

export async function scheduleReminder(input: {
  phone: string;
  scheduled_at: string;  // ISO
  kind: string;
  message_hint?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.phone || !input.scheduled_at) return { ok: false, error: 'phone and scheduled_at required' };
  try {
    const r = await fetch(SCHEDULE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function cancelReminder(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const supa = supabaseAdmin();
    const { error } = await supa
      .from('scheduled_reminders')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
