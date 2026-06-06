import { AppShell } from '@/components/app-shell';
import { requireAuth } from '@/lib/auth';
import { getCockpitSignals } from '@/lib/cockpit-signals';

// Wraps every authenticated cockpit page. requireAuth() redirects to /login
// if there's no session, so the dashboard is gated while / (marketing) and
// /login stay public. AppShell adds the responsive sidebar (drawer on mobile).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const signals = await getCockpitSignals();
  const role = user.role === 'master_admin' ? 'admin' : user.role;

  return (
    <AppShell
      role={role}
      tenantName={user.tenant_name}
      tenantSlug={user.tenant_slug}
      hotLeadCount={signals.hotCount}
    >
      {children}
    </AppShell>
  );
}
