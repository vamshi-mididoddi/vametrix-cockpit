import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbm', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vametrix Engine',
  description: 'Cockpit — Vametrix Engine. Productized AI sales+marketing engine.',
};

async function getSidebarContext(userRole: 'admin' | 'team', userId: string, tenantId: string) {
  try {
    const supa = supabaseAdmin();
    const [{ data: tenant }, { data: hot }] = await Promise.all([
      supa.from('tenants').select('name,slug').eq('id', tenantId).maybeSingle(),
      supa.rpc('count_hot_leads', {
        p_tenant_id: tenantId,
        p_owner_id: userRole === 'team' ? userId : null,
      }),
    ]);
    return {
      tenantName: (tenant as any)?.name,
      tenantSlug: (tenant as any)?.slug,
      hotCount: typeof hot === 'number' ? hot : 0,
    };
  } catch {
    return { tenantName: undefined, tenantSlug: undefined, hotCount: 0 };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const pathname = headers().get('x-invoke-path') || '';

  if (pathname.startsWith('/login') || !user) {
    return (
      <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
        <body className="font-sans">{children}</body>
      </html>
    );
  }

  const sb = await getSidebarContext(user.role === 'master_admin' ? 'admin' : user.role, user.id, user.tenant_id);

  return (
    <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
      <body className="font-sans">
        <div className="flex h-screen">
          <Sidebar
            role={user.role === 'master_admin' ? 'admin' : user.role}
            tenantName={sb.tenantName || user.tenant_name}
            tenantSlug={sb.tenantSlug || user.tenant_slug}
            hotLeadCount={sb.hotCount}
          />
          <main className="flex-1 flex flex-col min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
