import { Bell } from 'lucide-react';
import { UserMenu } from './user-menu';
import { getCurrentUser } from '@/lib/auth';

export async function TopBar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const user = await getCurrentUser();
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
        {user ? (
          <UserMenu user={{ email: user.email, full_name: user.full_name, role: user.role }} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">?</div>
        )}
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
