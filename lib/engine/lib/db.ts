// Supabase service-role client — lazy singleton so Next.js can build without
// runtime env vars present. Engine helpers always scope by org_id explicitly.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let _db: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_db) {
    _db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return _db;
}

export const db: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (_t, prop) => (client() as any)[prop],
});

/** Throw with context if a Supabase call failed. */
export function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: no data returned`);
  return result.data;
}