'use client';

import { Bell } from 'lucide-react';

export function TopBar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  return (
    <header className="bg-bg-soft border-b border-bg-border px-6 py-3 flex items-center gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Engine</span><span>·</span><span className="text-slate-300">{breadcrumb}</span>
          </div>
        )}
        <h1 className="text-base font-semibold mt-0.5">{title}</h1>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <HealthPill label="n8n" online />
        <HealthPill label="Supabase" online />
        <HealthPill label="Meta API" online />
        <HealthPill label="OpenRouter" online />
        <button className="w-8 h-8 rounded-md bg-bg-card border border-bg-border flex items-center justify-center hover:border-bg-borderhover relative">
          <Bell className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-semibold">U</div>
      </div>
    </header>
  );
}

function HealthPill({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="px-2 py-1 bg-bg-card border border-bg-border rounded-md flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-accent-500' : 'bg-rose-500'}`} />
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
