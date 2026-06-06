import { Bell, Activity, Flame } from 'lucide-react';
import { UserMenu } from './user-menu';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

async function getTopbarSignals(userId: string, tenantId: string, role: string) {
  try {
    const supa = supabaseAdmin();
    const [{ data: hot }, { data: health }] = await Promise.all([
      supa.rpc('count_hot_leads', {
        p_tenant_id: tenantId,
        p_owner_id: role === 'admin' ? null : userId,
      }),
      role === 'admin' ? supa.rpc('engine_health_summary', { p_tenant_id: tenantId }) : Promise.resolve({ data: null }),
    ]);
    return {
      hotCount: typeof hot === 'number' ? hot : 0,
      engineHealth: Array.isArray(health) ? health[0] : (health as any),
    };
  } catch {
    return { hotCount: 0, engineHealth: null };
  }
}

export async function TopBar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const user = await getCurrentUser();
  const sig = user ? await getTopbarSignals(user.id, user.tenant_id, user.role) : { hotCount: 0, engineHealth: null };
  const role = user?.role === 'master_admin' ? 'admin' : user?.role;
  const isAdmin = role === 'admin';

  const overallStatus = sig.engineHealth?.overall_status || null;
  const healthColor =
    overallStatus === 'HEALTHY' ? 'text-accent-300 bg-accent-500/10 border-accent-500/30' :
    overallStatus === 'CRITICAL' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30 animate-pulse' :
    overallStatus === 'NEEDS_ATTENTION' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
    'text-slate-400 bg-bg-card border-bg-border';
  const healthLabel = overallStatus ? overallStatus.replace('_', ' ') : 'idle';

  return (
    <header className="bg-bg-soft border-b border-bg-border px-6 py-3 flex items-center gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Engine</span><span>·</span><span className="text-slate-300">{breadcrumb}</span>
          </div>
        )}
        <h1 className="text-base font-semibold mt-0.5 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        {/* Hot lead counter — visible to everyone */}
        {sig.hotCount > 0 && (
          <Link
            href={isAdmin ? '/leads' : '/leads?view=mine'}
            className="px-3 py-1.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-semibold hover:bg-rose-500/25 transition"
          >
            <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{sig.hotCount} hot {isAdmin ? '' : '· you'}</span>
          </Link>
        )}

        {/* Engine health pill — admin only */}
        {isAdmin && (
          <Link href="/ceo"
            className={`px-3 py-1.5 rounded-md border flex items-center gap-1.5 font-medium uppercase tracking-wider text-[10px] hover:opacity-90 transition ${healthColor}`}
            title="Open VAMETRIX CEO"
          >
            <Activity className="w-3 h-3" strokeWidth={2.5} />
            <span>{healthLabel}</span>
          </Link>
        )}

        {/* Notifications */}
        <button className="w-8 h-8 rounded-md bg-bg-card border border-bg-border flex items-center justify-center hover:border-bg-borderhover relative" title="Notifications">
          <Bell className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
          {sig.hotCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />}
        </button>

        {/* User menu */}
        {user ? (
          <UserMenu user={{ email: user.email, full_name: user.full_name, role: user.role, tenant_name: user.tenant_name }} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">?</div>
        )}
      </div>
    </header>
  );
}
