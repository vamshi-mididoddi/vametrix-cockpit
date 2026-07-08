// Sales OS data access — server-side only (service role). Reads the
// VAMETRIX Sales platform tables (sales_*), which are separate from the
// legacy marketing engine tables this cockpit was built on.
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function salesDb() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Sales OS needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env');
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface SalesOrg { id: string; slug: string; name: string; config: any; branding: any }

/**
 * Org scoping — the three-tier structure:
 *  - master admin (platform): sees any org; picks via 'vmx_org' cookie (Clients page)
 *  - client admin / rep: locked to THEIR org (login tenant_slug ↔ sales_orgs.slug,
 *    normalized: 'befach_international' matches 'befach')
 */
export async function defaultOrg(): Promise<SalesOrg> {
  const { requireAuth, isMasterAdmin } = await import('./auth');
  const { cookies } = await import('next/headers');
  const user = await requireAuth();
  const db = salesDb();

  if (isMasterAdmin(user)) {
    const picked = cookies().get('vmx_org')?.value;
    if (picked) {
      const { data } = await db.from('sales_orgs').select('id,slug,name,config,branding')
        .eq('slug', picked).eq('status', 'active').maybeSingle();
      if (data) return data as SalesOrg;
    }
    const { data, error } = await db.from('sales_orgs').select('id,slug,name,config,branding')
      .eq('status', 'active').order('created_at').limit(1).single();
    if (error) throw new Error(error.message);
    return data as SalesOrg;
  }

  // Client users: locked to their own org — no cookie, no choice.
  const loginSlug = (user.tenant_slug ?? '').toLowerCase();
  const { data: orgs } = await db.from('sales_orgs').select('id,slug,name,config,branding').eq('status', 'active');
  const mine = (orgs ?? []).find(o =>
    loginSlug === o.slug || loginSlug.startsWith(o.slug) || o.slug.startsWith(loginSlug.split('_')[0] ?? ''));
  if (!mine) throw new Error('Your account is not linked to a Sales OS client — contact your administrator.');
  return mine as SalesOrg;
}

/** Master-admin gate for platform pages (Clients). */
export async function requirePlatformAdmin() {
  const { requireAuth, isMasterAdmin } = await import('./auth');
  const { redirect } = await import('next/navigation');
  const user = await requireAuth();
  if (!isMasterAdmin(user)) redirect('/sales');
  return user;
}
