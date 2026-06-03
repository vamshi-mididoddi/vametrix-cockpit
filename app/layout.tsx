import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { getCurrentUser } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jbm = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbm', display: 'swap' });

export const metadata: Metadata = {
  title: 'Vametrix Engine',
  description: 'Cockpit — Vametrix Engine. Productized AI sales+marketing engine.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const pathname = headers().get('x-invoke-path') || '';

  // On /login show only the children (the form). No sidebar.
  if (pathname.startsWith('/login') || !user) {
    return (
      <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
        <body className="font-sans">{children}</body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${inter.variable} ${jbm.variable}`}>
      <body className="font-sans">
        <div className="flex h-screen">
          <Sidebar role={user.role} />
          <main className="flex-1 flex flex-col min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
