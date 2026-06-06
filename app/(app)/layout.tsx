import { Sidebar } from '@/components/sidebar';
import { requireAuth } from '@/lib/auth';
import { getCockpitSignals } from '@/lib/cockpit-signals';

// This layout wraps every authenticated cockpit page.
// requireAuth() redirects to /login if there's no session — so the dashboard
// is gated, while / (marketing) and /login stay public.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const signals = await getCockpitSignals();
  const role = user.role === 'master_admin' ? 'admin' : user.role;

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        role={role}
        tenantName={user.tenant_name}
        tenantSlug={user.tenant_slug}
        hotLeadCount={signals.hotCount}
      />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
