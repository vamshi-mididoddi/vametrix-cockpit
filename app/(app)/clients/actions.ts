'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireMasterAdmin } from '@/lib/auth';
import { PLAN_TIERS, type PlanTier } from '@/lib/billing';
import { revalidatePath } from 'next/cache';

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'client';
}

export interface NewClientInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  plan?: PlanTier;
}

export async function createClient(input: NewClientInput): Promise<{ ok: boolean; error?: string; slug?: string }> {
  await requireMasterAdmin();
  const name = (input.name || '').trim();
  if (!name) return { ok: false, error: 'Company name is required' };
  const plan: PlanTier = PLAN_TIERS.includes(input.plan as PlanTier) ? (input.plan as PlanTier) : 'starter';

  try {
    const supa = supabaseAdmin();
    let slug = slugify(name);

    // Ensure slug is unique (append -2, -3, … if taken)
    for (let i = 0; i < 25; i++) {
      const probe = i === 0 ? slug : `${slug}_${i + 1}`;
      const { data: existing } = await supa.from('tenants').select('id').eq('slug', probe).maybeSingle();
      if (!existing) { slug = probe; break; }
    }

    const { error } = await supa.from('tenants').insert({
      slug,
      name,
      plan,
      status: 'trial',
      primary_contact_name: input.contactName?.trim() || null,
      primary_contact_email: input.contactEmail?.trim() || null,
      whatsapp_number: input.whatsappNumber?.trim() || null,
      onboarding_step: 'signed_up',
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath('/clients');
    return { ok: true, slug };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

const ALLOWED_STATUS = ['active', 'trial', 'paused', 'churned'];

export async function updateClient(
  tenantId: string,
  patch: { plan?: PlanTier; status?: string },
): Promise<{ ok: boolean; error?: string }> {
  await requireMasterAdmin();
  if (!tenantId) return { ok: false, error: 'missing tenant' };
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.plan && PLAN_TIERS.includes(patch.plan)) update.plan = patch.plan;
  if (patch.status && ALLOWED_STATUS.includes(patch.status)) update.status = patch.status;
  try {
    const supa = supabaseAdmin();
    const { error } = await supa.from('tenants').update(update).eq('id', tenantId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/clients/${tenantId}`);
    revalidatePath('/clients');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Save a service's credentials into tenant_credentials. Only non-empty values
// are written, so leaving a (secret) field blank never wipes an existing value.
export async function setServiceCredentials(
  tenantId: string,
  service: string,
  entries: Record<string, string>,
): Promise<{ ok: boolean; error?: string; saved?: number }> {
  await requireMasterAdmin();
  if (!tenantId || !service) return { ok: false, error: 'missing tenant/service' };
  const rows = Object.entries(entries || {})
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([credential_key, v]) => ({
      tenant_id: tenantId,
      service,
      credential_key,
      credential_value: v.trim(),
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return { ok: true, saved: 0 };
  try {
    const supa = supabaseAdmin();
    const { error } = await supa
      .from('tenant_credentials')
      .upsert(rows, { onConflict: 'tenant_id,service,credential_key' });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/clients/${tenantId}`);
    return { ok: true, saved: rows.length };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function randomPassword(): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  // crypto-free, good enough for a one-time temp password the admin resets
  let pw = '';
  for (let i = 0; i < 14; i++) pw += charset.charAt(Math.floor(Math.random() * charset.length));
  return 'Vam-' + pw;
}

// Create a login for THIS client's own admin, scoped to their tenant. The user
// signs in and sees only their tenant's data (every page filters by tenant_id).
export async function inviteClientAdmin(
  tenantId: string,
  email: string,
  fullName: string,
): Promise<{ ok: boolean; error?: string; temp_password?: string; email?: string }> {
  await requireMasterAdmin();
  const mail = (email || '').trim().toLowerCase();
  if (!tenantId) return { ok: false, error: 'missing tenant' };
  if (!mail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { ok: false, error: 'valid email required' };
  try {
    const supa = supabaseAdmin();
    const tempPassword = randomPassword();
    // Auto-confirm so no SMTP is needed; the admin changes it on first login.
    const { data, error } = await supa.auth.admin.createUser({
      email: mail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || mail },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.user?.id) {
      const { error: pErr } = await supa.from('user_profiles').upsert({
        id: data.user.id,
        role: 'admin',
        full_name: fullName || mail,
        tenant_id: tenantId,
      } as any);
      if (pErr) return { ok: false, error: pErr.message };
    }
    revalidatePath(`/clients/${tenantId}`);
    return { ok: true, temp_password: tempPassword, email: mail };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
