'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const N8N_BASE = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';

type R = { ok: boolean; error?: string; [k: string]: any };

export async function runEyesNow(): Promise<R> {
  await requireAdmin();
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-0a-eyes-ondemand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!r.ok) return { ok: false, error: `eyes http ${r.status}` };
    const out = await r.json();
    revalidatePath('/ceo');
    return { ok: true, ...out };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function runVoiceNow(): Promise<R> {
  await requireAdmin();
  try {
    const r = await fetch(`${N8N_BASE}/webhook/vametrix-0b-voice-ondemand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!r.ok) return { ok: false, error: `voice http ${r.status}` };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function resolveObservation(id: number): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('ceo_observations').update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: u.id,
    }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/ceo');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
