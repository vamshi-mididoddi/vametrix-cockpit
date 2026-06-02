'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AGENTS, INFRA, STATUS_META } from '@/lib/agents';
import * as Icons from 'lucide-react';
import { Search, LayoutDashboard } from 'lucide-react';

function Icon({ name, className }: { name: string; className?: string }) {
  // Convert kebab-case to PascalCase to look up in lucide-react
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

interface Group {
  title: string;
  items: { id: string; label: string; href: string; icon: string; status?: string; num?: number }[];
}

export function Sidebar() {
  const pathname = usePathname() || '';

  const groups: Group[] = [
    { title: '', items: [{ id: 'overview', label: 'Engine Overview', href: '/', icon: 'layout-dashboard' }] },
    { title: 'Sales & Marketing', items: AGENTS.filter(a => a.fleet === 'Sales & Marketing').map(a => ({ id: a.id, label: a.name, href: `/${a.id}`, icon: a.icon, status: a.status, num: a.num })) },
    { title: 'Operations', items: AGENTS.filter(a => a.fleet === 'Operations').map(a => ({ id: a.id, label: a.name, href: `/${a.id}`, icon: a.icon, status: a.status, num: a.num })) },
    { title: 'Intelligence', items: AGENTS.filter(a => a.fleet === 'Intelligence').map(a => ({ id: a.id, label: a.name, href: `/${a.id}`, icon: a.icon, status: a.status, num: a.num })) },
    { title: 'Infrastructure', items: INFRA.map(i => ({ id: i.id, label: i.label, href: `/${i.id}`, icon: i.icon, status: i.status })) },
  ];

  return (
    <aside className="w-64 bg-bg-soft border-r border-bg-border flex flex-col shrink-0 h-screen">
      <div className="px-4 py-4 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-sm shrink-0">V</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">Vametrix Engine</div>
            <div className="text-[10px] text-slate-500 truncate font-mono">befach · v0.6</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search…"
            className="w-full bg-bg-card border border-bg-border rounded-md pl-8 pr-2 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-accent-500/50"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar px-2 pb-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <div className="px-3 mt-4 mb-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{g.title}</div>}
            {g.items.map(it => {
              const active = (it.href === '/' && pathname === '/') || (it.href !== '/' && pathname.startsWith(it.href));
              const meta = it.status ? STATUS_META[it.status as keyof typeof STATUS_META] : null;
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs flex items-center gap-2 group transition ${active ? 'bg-accent-500/10 text-slate-100' : 'text-slate-400 hover:bg-bg-card hover:text-slate-200'}`}
                >
                  {it.num != null ? (
                    <span className="text-[10px] font-mono text-slate-600 mr-1.5 w-6 text-right">#{String(it.num).padStart(2, '0')}</span>
                  ) : (
                    <span className="w-6" />
                  )}
                  <span className={`shrink-0 ${active ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                    <Icon name={it.icon} className="w-4 h-4" />
                  </span>
                  <span className="flex-1 truncate">{it.label}</span>
                  {meta ? <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-accent-500' : meta.dot} shrink-0`} /> : <span className="w-1.5 h-1.5" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

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
