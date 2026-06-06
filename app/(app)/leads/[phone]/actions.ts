'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, requireAdmin, AuthedUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const N8N_BASE = process.env.N8N_BASE_URL || 'https://n8n.srv1048087.hstgr.cloud';

type R = { ok: boolean; error?: string; [k: string]: any };

async function logActivity(
  u: AuthedUser,
  phone: string,
  activity_type: string,
  content: string,
  metadata: any = {},
) {
  const supa = supabaseAdmin();
  await supa.from('lead_activities').insert({
    tenant_id: u.tenant_id,
    lead_phone: phone,
    actor_user_id: u.id,
    actor_label: u.full_name || u.email || 'Team',
    activity_type,
    content,
    metadata,
  });
}

// ───── Mark as Won → triggers Meta CAPI Purchase event ─────
export async function markWon(phone: string, deal_value_inr: number, won_reason?: string): Promise<R> {
  const u = await requireAuth();
  if (!phone) return { ok: false, error: 'phone required' };
  if (!deal_value_inr || deal_value_inr <= 0) return { ok: false, error: 'deal value must be > 0' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('leads_log').update({
      status: 'won',
      won_at: new Date().toISOString(),
      deal_value_inr,
      won_reason: won_reason || null,
      last_action_at: new Date().toISOString(),
    }).eq('phone', phone);
    if (error) return { ok: false, error: error.message };

    await logActivity(u, phone, 'status_changed',
      `Marked WON · ₹${deal_value_inr.toLocaleString('en-IN')}${won_reason ? ' · ' + won_reason : ''}`,
      { new_status: 'won', deal_value_inr, won_reason });

    // Fire CAPI Purchase event to Meta (fire-and-forget — cron retries if it fails)
    fetch(`${N8N_BASE}/webhook/vametrix-91-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, deal_value_inr, currency: 'INR' }),
    }).catch(e => console.error('capi fire err', e));

    revalidatePath('/leads');
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ───── Mark as Lost ─────
export async function markLost(phone: string, lost_reason: string): Promise<R> {
  const u = await requireAuth();
  if (!phone) return { ok: false, error: 'phone required' };
  if (!lost_reason?.trim()) return { ok: false, error: 'lost reason required' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('leads_log').update({
      status: 'lost',
      lost_at: new Date().toISOString(),
      lost_reason,
      last_action_at: new Date().toISOString(),
    }).eq('phone', phone);
    if (error) return { ok: false, error: error.message };

    await logActivity(u, phone, 'status_changed', `Marked LOST · ${lost_reason}`,
      { new_status: 'lost', lost_reason });

    revalidatePath('/leads');
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ───── Reopen (undo Won/Lost) ─────
export async function reopen(phone: string): Promise<R> {
  const u = await requireAuth();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('leads_log').update({
      status: 'open',
      won_at: null,
      lost_at: null,
      last_action_at: new Date().toISOString(),
    }).eq('phone', phone);
    if (error) return { ok: false, error: error.message };
    await logActivity(u, phone, 'status_changed', 'Reopened', { new_status: 'open' });
    revalidatePath('/leads');
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ───── Add a note ─────
export async function addNote(phone: string, note: string): Promise<R> {
  const u = await requireAuth();
  if (!note?.trim()) return { ok: false, error: 'note required' };
  try {
    await logActivity(u, phone, 'note', note.trim(), {});
    // Touch last_action_at
    const supa = supabaseAdmin();
    await supa.from('leads_log').update({ last_action_at: new Date().toISOString() }).eq('phone', phone);
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ───── Reassign owner (admin only) ─────
export async function reassign(phone: string, new_owner_id: string | null): Promise<R> {
  const u = await requireAdmin();
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('leads_log').update({
      owner_id: new_owner_id,
      owner_assigned_at: new Date().toISOString(),
      last_action_at: new Date().toISOString(),
    }).eq('phone', phone);
    if (error) return { ok: false, error: error.message };

    // Look up new owner's name for activity log
    let newOwnerName = 'unassigned';
    if (new_owner_id) {
      const { data: profile } = await supa.from('user_profiles').select('full_name').eq('id', new_owner_id).maybeSingle();
      newOwnerName = (profile as any)?.full_name || 'a teammate';
    }
    await logActivity(u, phone, 'reassigned', `Reassigned to ${newOwnerName}`, { new_owner_id });

    revalidatePath('/leads');
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ───── Update priority ─────
export async function setPriority(phone: string, priority: 'High' | 'Medium' | 'Low'): Promise<R> {
  const u = await requireAuth();
  if (!['High','Medium','Low'].includes(priority)) return { ok: false, error: 'invalid priority' };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('leads_log').update({ priority, last_action_at: new Date().toISOString() }).eq('phone', phone);
    if (error) return { ok: false, error: error.message };
    await logActivity(u, phone, 'priority_changed', `Priority set to ${priority}`, { priority });
    revalidatePath('/leads');
    revalidatePath(`/leads/${encodeURIComponent(phone)}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
