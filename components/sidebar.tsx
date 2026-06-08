'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { AGENTS, STATUS_META } from '@/lib/agents';
import * as Icons from 'lucide-react';
import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';

function Icon({ name, className }: { name: string; className?: string }) {
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

interface NavItem { id: string; label: string; href: string; icon: string; status?: string; num?: number; badge?: number }

const fleetAgents = (fleet: string): NavItem[] =>
  AGENTS.filter(a => a.fleet === fleet).map(a => ({
    id: a.id, label: a.name, href: `/${a.id}`, icon: a.icon, status: a.status, num: a.num,
  }));

export function Sidebar({
  role, tenantName, tenantSlug, hotLeadCount,
}: {
  role: 'admin' | 'team';
  tenantName?: string;
  tenantSlug?: string;
  hotLeadCount?: number;
}) {
  const pathname = usePathname() || '';
  const isAdmin = role === 'admin';

  const [open, setOpen] = useState<Record<string, boolean>>({
    sales: true, intel: false, ops: true, config: false,
  });
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  // ── WORKSPACE (always visible, never collapsed) ──
  const workspace: NavItem[] = isAdmin
    ? [
        { id: 'dashboard', label: 'Overview',        href: '/dashboard', icon: 'layout-dashboard' },
        { id: 'ceo',       label: 'VAMETRIX CEO',    href: '/ceo',       icon: 'shield', status: 'live' },
        { id: 'leads',     label: 'Lead Pipeline',   href: '/leads',     icon: 'kanban-square', status: 'live', badge: hotLeadCount },
        { id: 'inbox',     label: 'WhatsApp Inbox',  href: '/inbox',     icon: 'message-square', status: 'live' },
      ]
    : [
        { id: 'dashboard',  label: 'My Today',       href: '/dashboard',        icon: 'layout-dashboard' },
        { id: 'mine',       label: 'My Leads',       href: '/leads?view=mine',  icon: 'kanban-square', badge: hotLeadCount },
        { id: 'leads',      label: 'All Open Leads', href: '/leads',            icon: 'list' },
        { id: 'inbox',      label: 'WhatsApp Inbox', href: '/inbox',            icon: 'message-square' },
      ];

  // ── MARKETING & SALES system ──
  const marketingSales: NavItem[] = [
    { id: 'marketing',  label: 'Marketing Brain', href: '/marketing',  icon: 'rocket', status: 'live' },
    { id: 'outbound',   label: 'Outbound B2B',    href: '/outbound',   icon: 'send',   status: 'live' },
    { id: 'brands',     label: 'Brand Context',   href: '/brands',     icon: 'tag',    status: 'live' },
    { id: 'tech-audit', label: 'Tech Stack Audit',href: '/tech-audit', icon: 'shield-check', status: 'live' },
    ...fleetAgents('Sales & Marketing'),
  ];

  // ── INTELLIGENCE system ──
  const intelligence: NavItem[] = fleetAgents('Intelligence');

  // ── OPERATIONS system ──
  const operations: NavItem[] = isAdmin
    ? [
        { id: 'broadcast', label: 'Broadcast',       href: '/broadcast', icon: 'megaphone' },
        { id: 'reminders', label: 'Smart Reminders', href: '/reminders', icon: 'bell-ring' },
        { id: 'templates', label: 'WA Templates',    href: '/templates', icon: 'file-text' },
        { id: 'opt-outs',  label: 'Opt-outs',        href: '/opt-outs',  icon: 'ban' },
        { id: 'knowledge', label: 'Knowledge Base',  href: '/knowledge', icon: 'book' },
        ...fleetAgents('Operations'),
      ]
    : [
        { id: 'broadcast', label: 'Broadcast',       href: '/broadcast', icon: 'megaphone' },
        { id: 'reminders', label: 'Smart Reminders', href: '/reminders', icon: 'bell-ring' },
        { id: 'templates', label: 'WA Templates',    href: '/templates', icon: 'file-text' },
      ];

  // ── CONFIGURATION ──
  const config: NavItem[] = [
    { id: 'team',      label: 'Team & Roles',    href: '/team',      icon: 'users' },
    { id: 'workflows', label: 'Workflows (n8n)', href: '/workflows', icon: 'workflow' },
    { id: 'cost',      label: 'Cost Monitor',    href: '/cost',      icon: 'wallet' },
    { id: 'audit',     label: 'Audit Log',       href: '/audit',     icon: 'clipboard-list' },
    { id: 'settings',  label: 'Settings',        href: '/settings',  icon: 'settings' },
  ];

  return (
    <aside className="w-[252px] bg-bg-soft border-r border-bg-border flex flex-col shrink-0 h-screen">
      {/* Brand */}
      <Link href="/dashboard" className="px-4 py-4 border-b border-bg-border block hover:bg-white/[0.02] transition">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg shadow-accent-500/20">V</div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold tracking-tight truncate">{tenantName || 'Vametrix Engine'}</div>
            <div className="text-[10px] text-zinc-500 truncate font-mono">{tenantSlug ? `${tenantSlug} · ` : ''}{role}</div>
          </div>
        </div>
      </Link>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" strokeWidth={2} />
          <input
            type="text"
            placeholder={isAdmin ? 'Search…' : 'Search leads…'}
            className="w-full bg-bg-card border border-bg-border rounded-md pl-8 pr-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
        {/* Workspace — always open */}
        <Group title={isAdmin ? 'Workspace' : 'My work'} items={workspace} pathname={pathname} />

        {/* Marketing & Sales */}
        <Group
          title="Marketing & Sales"
          items={isAdmin ? marketingSales : []}
          pathname={pathname}
          collapsible isOpen={open.sales} onToggle={() => toggle('sales')}
          hidden={!isAdmin}
        />

        {/* Intelligence */}
        <Group
          title="Intelligence"
          items={isAdmin ? intelligence : []}
          pathname={pathname}
          collapsible isOpen={open.intel} onToggle={() => toggle('intel')}
          hidden={!isAdmin}
        />

        {/* Operations */}
        <Group
          title="Operations"
          items={operations}
          pathname={pathname}
          collapsible isOpen={open.ops} onToggle={() => toggle('ops')}
        />

        {/* Configuration — admin only */}
        <Group
          title="Configuration"
          items={isAdmin ? config : []}
          pathname={pathname}
          collapsible isOpen={open.config} onToggle={() => toggle('config')}
          hidden={!isAdmin}
        />

        {!isAdmin && (
          <div className="mt-4">
            <NavLink item={{ id: 'profile', label: 'Profile & password', href: '/profile', icon: 'user-circle' }} pathname={pathname} />
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-bg-border px-3 py-2.5 text-[11px] text-zinc-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          <span>Engine online</span>
        </div>
        <span className="font-mono">v1.0</span>
      </div>
    </aside>
  );
}

function Group({
  title, items, pathname, collapsible = false, isOpen = true, onToggle, hidden = false,
}: {
  title: string; items: NavItem[]; pathname: string;
  collapsible?: boolean; isOpen?: boolean; onToggle?: () => void; hidden?: boolean;
}) {
  if (hidden || items.length === 0) return null;
  return (
    <div>
      <button
        onClick={onToggle}
        disabled={!collapsible}
        className={`w-full px-3 mt-4 mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-zinc-500 font-semibold ${collapsible ? 'cursor-pointer hover:text-zinc-300' : 'cursor-default'}`}
      >
        {collapsible && <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} strokeWidth={2.5} />}
        <span>{title}</span>
        <span className="ml-auto text-zinc-700 font-mono">{items.length}</span>
      </button>
      {isOpen && items.map(it => <NavLink key={it.id} item={it} pathname={pathname} />)}
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const cleanHref = item.href.split('?')[0];
  const active =
    (cleanHref === '/dashboard' && pathname === '/dashboard') ||
    (cleanHref !== '/dashboard' && pathname.startsWith(cleanHref) && cleanHref !== '/');
  const meta = item.status ? STATUS_META[item.status as keyof typeof STATUS_META] : null;
  return (
    <Link
      href={item.href}
      className={`w-full text-left pl-3 pr-2.5 py-1.5 rounded-md text-[13px] flex items-center gap-2 group transition ${
        active ? 'bg-accent-500/10 text-zinc-100' : 'text-zinc-400 hover:bg-bg-card hover:text-zinc-200'
      }`}
    >
      {item.num != null ? (
        <span className="text-[10px] font-mono text-zinc-600 w-5 text-right shrink-0">{String(item.num).padStart(2, '0')}</span>
      ) : (
        <span className="w-5 shrink-0 flex items-center justify-center">
          <span className={`shrink-0 ${active ? 'text-accent-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
            <Icon name={item.icon} className="w-4 h-4" />
          </span>
        </span>
      )}
      {item.num != null && (
        <span className={`shrink-0 ${active ? 'text-accent-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
          <Icon name={item.icon} className="w-4 h-4" />
        </span>
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">{item.badge}</span>
      ) : meta ? (
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-accent-500' : meta.dot} shrink-0`} />
      ) : <span className="w-1.5 h-1.5" />}
    </Link>
  );
}
