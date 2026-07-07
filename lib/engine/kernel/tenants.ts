// Tenant resolution â€” every request enters through here. Orgs are rows;
// credentials are resolved from credentials_ref â†’ env mapping for v0
// (Phase 1 replaces this with the encrypted per-tenant credential vault).
import { db, must } from '../lib/db';
import { env } from '../lib/env';

export interface Org {
  id: string;
  slug: string;
  name: string;
  status: string;
  timezone: string;
  branding: Record<string, any>;
  config: Record<string, any>;
}

export interface Channel {
  id: string;
  org_id: string;
  type: string;
  provider: string | null;
  identifier: string | null;
  credentials_ref: string | null;
  config: Record<string, any>;
  active: boolean;
}

export async function orgBySlug(slug: string): Promise<Org> {
  return must(
    await db.from('sales_orgs').select('*').eq('slug', slug).eq('status', 'active').single(),
    `org '${slug}'`,
  ) as Org;
}

export async function orgById(id: string): Promise<Org> {
  return must(
    await db.from('sales_orgs').select('*').eq('id', id).single(),
    `org ${id}`,
  ) as Org;
}

export async function orgChannel(orgId: string, type: string): Promise<Channel | null> {
  const { data } = await db
    .from('sales_channels')
    .select('*')
    .eq('org_id', orgId)
    .eq('type', type)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  return (data as Channel) ?? null;
}

/** Credential resolution: tenant vault first, platform .env as legacy fallback. */
export async function whatsappCreds(orgId: string): Promise<{ token: string; phoneNumberId: string; graphVersion: string }> {
  const { getServiceCredentials } = await import('./credentials');
  const vault = await getServiceCredentials(orgId, 'meta_whatsapp');
  if (vault.access_token && vault.phone_number_id) {
    return {
      token: vault.access_token,
      phoneNumberId: vault.phone_number_id,
      graphVersion: vault.graph_version ?? 'v22.0',
    };
  }
  // Legacy fallback (pre-vault tenants) â€” remove once all tenants are migrated.
  return {
    token: env('META_WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: env('META_WHATSAPP_PHONE_NUMBER_ID'),
    graphVersion: env('META_WHATSAPP_GRAPH_VERSION'),
  };
}
