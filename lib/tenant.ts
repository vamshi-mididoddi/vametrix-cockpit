// Tenant context helpers. Use these in any server action / page that needs
// to read tenant credentials or scope queries to the current tenant.
//
// Pattern:
//   const tenant = await getCurrentTenantId();
//   const zoho = await getTenantCredentials(tenant, 'zoho_crm');
//   // zoho => { client_id, client_secret, refresh_token, api_domain, ... }

import { supabaseAdmin } from './supabase';
import { getCurrentUser, DEFAULT_TENANT_ID } from './auth';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
  timezone: string;
  currency: string;
  whatsapp_number: string | null;
  enabled_agents: string[];
  brand_color_hex: string | null;
  brand_logo_url: string | null;
  onboarding_step: string;
}

// ---- Current tenant (from logged-in user) ----
export async function getCurrentTenantId(): Promise<string> {
  const u = await getCurrentUser();
  return u?.tenant_id || DEFAULT_TENANT_ID;
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const tenantId = await getCurrentTenantId();
  return getTenantById(tenantId);
}

// ---- Tenant lookups (use admin client — bypasses RLS) ----
export async function getTenantById(id: string): Promise<Tenant | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from('tenants').select('*').eq('id', id).maybeSingle();
    return (data as Tenant) || null;
  } catch {
    return null;
  }
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from('tenants').select('*').eq('slug', slug).maybeSingle();
    return (data as Tenant) || null;
  } catch {
    return null;
  }
}

// ---- Credentials lookup ----
// service: 'meta_whatsapp' | 'meta_ads' | 'zoho_crm' | 'telegram' | 'openrouter' | 'n8n' | ...
export async function getTenantCredentials(
  tenantId: string,
  service: string,
): Promise<Record<string, string>> {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.rpc('get_tenant_credentials', {
      p_tenant_id: tenantId,
      p_service: service,
    });
    if (error || !data) return {};
    return data as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getTenantCredential(
  tenantId: string,
  service: string,
  key: string,
): Promise<string | null> {
  try {
    const supa = supabaseAdmin();
    const { data, error } = await supa.rpc('get_tenant_credential', {
      p_tenant_id: tenantId,
      p_service: service,
      p_key: key,
    });
    if (error) return null;
    return (data as string) || null;
  } catch {
    return null;
  }
}

// Convenience: returns a credential, falling back to process.env if not in DB yet.
// Use during the transition period — eventually remove the env fallback.
export async function getTenantCredentialOrEnv(
  tenantId: string,
  service: string,
  key: string,
  envFallback: string,
): Promise<string | null> {
  const v = await getTenantCredential(tenantId, service, key);
  if (v) return v;
  return process.env[envFallback] || null;
}

// ---- Tenant overview (master admin view) ----
export async function listAllTenants(): Promise<any[]> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.from('tenant_overview').select('*');
    return data || [];
  } catch {
    return [];
  }
}
