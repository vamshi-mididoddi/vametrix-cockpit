'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AGENTS, INFRA, STATUS_META } from '@/lib/agents';
import * as Icons from 'lucide-react';
import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';

function Icon({ name, className }: { name: string; className?: string }) {
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

interface NavItem { id: string; label: string; href: string; icon: string; status?: string; num?: number; badge?: number }
interface Group { title: string; items: NavItem[]; collapsible?: boolean; defaultOpen?: boolean }

// Pages visible to team members — kept tight on purpose
const TEAM_VISIBLE_INFRA = new Set(['leads', 'inbox', 'reminders', 'templates', 'broadcast']);

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

  // Admin sections — collapsible
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    today: true,        // daily ops always open
    marketing: false,
    agents: false,
    config: false,
  });

  const toggle = (key: string) => setOpenSections(o => ({ ...o, [key]: !o[key] }));

  const todayItems: NavItem[] = isAdmin
    ? [
        { id: 'overview', label: 'Engine Overview',   href: '/',          icon: 'layout-dashboard' },
        { id: 'ceo',      label: 'VAMETRIX CEO',      href: '/ceo',       icon: 'shield',   status: 'live' },
        { id: 'leads',    label: 'Lead Pipeline',     href: '/leads',     icon: 'kanban-square', status: 'live', badge: hotLeadCount },
        { id: 'inbox',    label: 'WhatsApp Inbox',    href: '/inbox',     icon: 'message-square', status: 'live' },
      ]
    : [
        { id: 'overview',   label: 'My Today',          href: '/',                 icon: 'layout-dashboard' },
        { id: 'leads-mine', label: 'My Leads',          href: '/leads?view=mine',  icon: 'kanban-square', badge: hotLeadCount },
        { id: 'leads',      label: 'All Open Leads',    href: '/leads',            icon: 'list' },
        { id: 'inbox',      label: 'WhatsApp Inbox',    href: '/inbox',            icon: 'message-square' },
      ];

  const marketingItems: NavItem[] = [
    { id: 'marketing', label: 'Marketing Brain', href: '/marketing', icon: 'rocket', status: 'live' },
    { id: 'brands',    label: 'Brand Context',   href: '/brands',    icon: 'tag',    status: 'live' },
    { id: 'tech-audit',label: 'Tech Stack Audit',href: '/tech-audit',icon: 'shield-check', status: 'live' },
  ];

  const opsItems: NavItem[] = (isAdmin ? [
    { id: 'broadcast', label: 'Broadcast',       href: '/broadcast', icon: 'megaphone' },
    { id: 'reminders', label: 'Smart Reminders', href: '/reminders', icon: 'bell-ring' },
    { id: 'templates', label: 'WA Templates',    href: '/templates', icon: 'file-text' },
    { id: 'opt-outs',  label: 'Opt-outs',        href: '/opt-outs',  icon: 'ban' },
    { id: 'knowledge', label: 'Knowledge Base',  href: '/knowledge', icon: 'book' },
  ] : [
    { id: 'broadcast', label: 'Broadcast',       href: '/broadcast', icon: 'megaphone' },
    { id: 'reminders', label: 'Smart Reminders', href: '/reminders', icon: 'bell-ring' },
    { id: 'templates', label: 'WA Templates',    href: '/templates', icon: 'file-text' },
  ]);

  const agentItems: NavItem[] = AGENTS.map(a => ({
    id: a.id, label: a.name, href: `/${a.id}`, icon: a.icon, status: a.status, num: a.num
  }));

  const configItems: NavItem[] = [
    { id: 'team',      label: 'Team & Roles',     href: '/team',      icon: 'users' },
    { id: 'workflows', label: 'Workflows (n8n)',  href: '/workflows', icon: 'workflow' },
    { id: 'cost',      label: 'Cost Monitor',     href: '/cost',      icon: 'wallet' },
    { id: 'audit',     label: 'Audit Log',        href: '/audit',     icon: 'clipboard-list' },
    { id: 'settings',  label: 'Settings',         href: '/settings',  icon: 'settings' },
  ];

  return (
    <aside className="w-64 bg-bg-soft border-r border-bg-border flex flex-col shrink-0 h-screen">
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-lg shadow-accent-500/20">
            V
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight truncate">{tenantName || 'Vametrix Engine'}</div>
            <div className="text-[10px] text-slate-500 truncate font-mono">
              {tenantSlug ? `${tenantSlug} · ` : ''}{role}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
          <input
            type="text"
            placeholder={isAdmin ? 'Search agents, pages…' : 'Search leads…'}
            className="w-full bg-bg-card border border-bg-border rounded-md pl-8 pr-2 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
        {/* Today section — always open, no collapse */}
        <NavGroup title={isAdmin ? 'Today' : 'My work'} items={todayItems} pathname={pathname} />

        {/* Daily ops (team or admin) */}
        <NavGroup
          title="Daily ops"
          items={opsItems}
          pathname={pathname}
          collapsible
          isOpen={openSections.today}
          onToggle={() => toggle('today')}
        />

        {/* Marketing — admin only */}
        {isAdmin && (
          <NavGroup
            title="Marketing brain"
            items={marketingItems}
            pathname={pathname}
            collapsible
            isOpen={openSections.marketing}
            onToggle={() => toggle('marketing')}
          />
        )}

        {/* Agents — admin only, collapsed by default */}
        {isAdmin && (
          <NavGroup
            title={`Agents (${AGENTS.length})`}
            items={agentItems}
            pathname={pathname}
            collapsible
            isOpen={openSections.agents}
            onToggle={() => toggle('agents')}
          />
        )}

        {/* Config — admin only */}
        {isAdmin && (
          <NavGroup
            title="Configuration"
            items={configItems}
            pathname={pathname}
            collapsible
            isOpen={openSections.config}
            onToggle={() => toggle('config')}
          />
        )}

        {/* Team profile shortcut */}
        {!isAdmin && (
          <div className="mt-4 px-2">
            <Link href="/profile"
              className="block px-3 py-1.5 rounded-md text-xs text-slate-400 hover:bg-bg-card hover:text-slate-200 transition">
              <Icons.UserCircle className="w-4 h-4 inline-block mr-2" strokeWidth={1.75} />
              Profile + password
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-bg-border px-3 py-2.5 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
          <span>Engine online</span>
        </div>
        <span className="font-mono">prod</span>
      </div>
    </aside>
  );
}

function NavGroup({
  title, items, pathname, collapsible = false, isOpen = true, onToggle,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        disabled={!collapsible}
        className={`w-full px-3 mt-4 mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${collapsible ? 'cursor-pointer hover:text-slate-300' : 'cursor-default'}`}
      >
        {collapsible && (
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} strokeWidth={2.5} />
        )}
        <span>{title}</span>
      </button>
      {isOpen && items.map(it => <NavLink key={it.id} item={it} pathname={pathname} />)}
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const href = item.href;
  const cleanHref = href.split('?')[0];
  const active = (href === '/' && pathname === '/') || (cleanHref !== '/' && pathname.startsWith(cleanHref));
  const meta = item.status ? STATUS_META[item.status as keyof typeof STATUS_META] : null;
  return (
    <Link
      href={href}
      className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 group transition ${
        active ? 'bg-accent-500/10 text-slate-100 border-l-2 border-accent-500 -ml-[2px]' : 'text-slate-400 hover:bg-bg-card hover:text-slate-200'
      }`}
    >
      {item.num != null ? (
        <span className="text-[10px] font-mono text-slate-600 mr-1.5 w-6 text-right">#{String(item.num).padStart(2, '0')}</span>
      ) : (
        <span className="w-6" />
      )}
      <span className={`shrink-0 ${active ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
        <Icon name={item.icon} className="w-4 h-4" />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="px-1.5 py-0.5 text-[9px] font-mono rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          {item.badge}
        </span>
      ) : meta ? (
        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-accent-500' : meta.dot} shrink-0`} />
      ) : <span className="w-1.5 h-1.5" />}
    </Link>
  );
}
