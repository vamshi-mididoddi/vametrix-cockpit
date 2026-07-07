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

export async function defaultOrg(): Promise<SalesOrg> {
  const db = salesDb();
  const { data, error } = await db.from('sales_orgs').select('id,slug,name,config,branding')
    .eq('status', 'active').order('created_at').limit(1).single();
  if (error) throw new Error(error.message);
  return data as SalesOrg;
}
