// Cached request-scoped helpers for cockpit chrome (sidebar + topbar).
// These ALL use React.cache so layout + topbar share one Supabase call per render.

import { cache } from 'react';
import { supabaseAdmin } from './supabase';
import { getCurrentUser } from './auth';

export interface CockpitSignals {
  hotCount: number;
  engineHealth: any | null;
}

// Hot lead count — different number for admin (all tenant) vs team (mine only)
export const getCockpitSignals = cache(async (): Promise<CockpitSignals> => {
  try {
    const user = await getCurrentUser();
    if (!user) return { hotCount: 0, engineHealth: null };
    const isAdmin = user.role === 'admin' || user.role === 'master_admin';

    const supa = supabaseAdmin();
    const [hotRes, healthRes] = await Promise.all([
      supa.rpc('count_hot_leads', {
        p_tenant_id: user.tenant_id,
        p_owner_id: isAdmin ? null : user.id,
      }),
      isAdmin
        ? supa.rpc('engine_health_summary', { p_tenant_id: user.tenant_id })
        : Promise.resolve({ data: null }),
    ]);

    const hotCount = typeof hotRes.data === 'number' ? hotRes.data : 0;
    const engineHealth = Array.isArray(healthRes.data) ? healthRes.data[0] : (healthRes.data as any);

    return { hotCount, engineHealth };
  } catch {
    return { hotCount: 0, engineHealth: null };
  }
});
