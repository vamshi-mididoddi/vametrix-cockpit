'use client';

import { Menu } from 'lucide-react';

// Hamburger shown only on mobile. Fires the event AppShell listens for.
export function MobileMenuButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('vametrix:toggle-nav'))}
      className="md:hidden w-9 h-9 -ml-1.5 rounded-md flex items-center justify-center hover:bg-bg-card text-zinc-300 shrink-0"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" strokeWidth={2} />
    </button>
  );
}
