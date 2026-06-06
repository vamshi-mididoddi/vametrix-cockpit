import { Bell, Activity, Flame } from 'lucide-react';
import { UserMenu } from './user-menu';
import { MobileMenuButton } from './mobile-menu-button';
import { getCurrentUser } from '@/lib/auth';
import { getCockpitSignals } from '@/lib/cockpit-signals';
import Link from 'next/link';

export async function TopBar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const [user, sig] = await Promise.all([getCurrentUser(), getCockpitSignals()]);
  const role = user?.role === 'master_admin' ? 'admin' : user?.role;
  const isAdmin = role === 'admin';

  const overallStatus = sig.engineHealth?.overall_status || null;
  const healthColor =
    overallStatus === 'HEALTHY' ? 'text-accent-300 bg-accent-500/10 border-accent-500/30' :
    overallStatus === 'CRITICAL' ? 'text-rose-300 bg-rose-500/10 border-rose-500/30 animate-pulse' :
    overallStatus === 'NEEDS_ATTENTION' ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' :
    'text-zinc-400 bg-bg-card border-bg-border';
  const healthLabel = overallStatus ? overallStatus.replace('_', ' ') : 'idle';

  return (
    <header className="bg-bg-soft border-b border-bg-border px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-2 md:gap-4 shrink-0 sticky top-0 z-40">
      <MobileMenuButton />
      <div className="flex-1 min-w-0">
        {breadcrumb && (
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Engine</span><span>·</span><span className="text-zinc-300">{breadcrumb}</span>
          </div>
        )}
        <h1 className="text-[15px] md:text-base font-semibold mt-0.5 truncate tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 text-[11px] shrink-0">
        {sig.hotCount > 0 && (
          <Link href={isAdmin ? '/leads' : '/leads?view=mine'}
            className="px-2.5 md:px-3 py-1.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 font-semibold hover:bg-rose-500/25 transition">
            <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>{sig.hotCount}</span>
            <span className="hidden sm:inline">hot{isAdmin ? '' : ' · you'}</span>
          </Link>
        )}
        {isAdmin && overallStatus && (
          <Link href="/ceo"
            className={`hidden sm:flex px-3 py-1.5 rounded-md border items-center gap-1.5 font-medium uppercase tracking-wider text-[10px] hover:opacity-90 transition ${healthColor}`}
            title="Open VAMETRIX CEO">
            <Activity className="w-3 h-3" strokeWidth={2.5} />
            <span>{healthLabel}</span>
          </Link>
        )}
        <button className="hidden sm:flex w-8 h-8 rounded-md bg-bg-card border border-bg-border items-center justify-center hover:border-bg-borderhover relative" title="Notifications">
          <Bell className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          {sig.hotCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />}
        </button>
        {user ? (
          <UserMenu user={{ email: user.email, full_name: user.full_name, role: user.role, tenant_name: user.tenant_name }} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs">?</div>
        )}
      </div>
    </header>
  );
}
