'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

// Client shell that makes the sidebar responsive:
//  - desktop (md+): fixed sidebar, always visible
//  - mobile (<md): hidden; slides in as an overlay drawer when the topbar
//    hamburger fires the 'vametrix:toggle-nav' event.
export function AppShell({
  role, tenantName, tenantSlug, hotLeadCount, children,
}: {
  role: 'admin' | 'team';
  tenantName?: string;
  tenantSlug?: string;
  hotLeadCount?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Listen for the hamburger toggle event (dispatched by the topbar button)
  useEffect(() => {
    const handler = () => setOpen(o => !o);
    window.addEventListener('vametrix:toggle-nav', handler);
    return () => window.removeEventListener('vametrix:toggle-nav', handler);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sidebarProps = { role, tenantName, tenantSlug, hotLeadCount };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar {...sidebarProps} />
      </div>

      {/* Mobile drawer */}
      <div className={`md:hidden fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        {/* Drawer */}
        <div className={`absolute left-0 top-0 h-full transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar {...sidebarProps} />
        </div>
      </div>

      {/* Main column */}
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
