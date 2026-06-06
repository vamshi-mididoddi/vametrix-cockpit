import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser } from '@/lib/auth';
import { getCockpitSignals } from '@/lib/cockpit-signals';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbm', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vametrix Engine — Autonomous AI for sales + marketing',
  description: 'Vametrix Engine — 16 AI agents that qualify, sell, and optimize your sales + marketing on autopilot. Built for Indian businesses.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();          // ← cached, deduped across components
  const pathname = headers().get('x-invoke-path') || '';

  if (pathname.startsWith('/login') || !user) {
    return (
      <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
        <body className="font-sans">{children}</body>
      </html>
    );
  }

  // Hot count + engine health are also cached → topbar gets these for free.
  const signals = await getCockpitSignals();
  const role = user.role === 'master_admin' ? 'admin' : user.role;

  return (
    <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
      <body className="font-sans">
        <div className="flex h-screen">
          <Sidebar
            role={role}
            tenantName={user.tenant_name}
            tenantSlug={user.tenant_slug}
            hotLeadCount={signals.hotCount}
          />
          <main className="flex-1 flex flex-col min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
