import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const u = await getCurrentUser();
  if (u) redirect(searchParams.next || '/');
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.06),transparent_45%)] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-soft" />

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xl shadow-glow ring-1 ring-white/10">
            V
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">Vametrix Engine</div>
            <div className="text-[11px] text-zinc-500 font-mono">Autonomous AI sales + marketing</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-8 shadow-pop backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight">Welcome back</h1>
            <p className="text-xs text-zinc-500 mt-1">Sign in to your engine cockpit.</p>
          </div>
          <LoginForm nextPath={searchParams.next || '/'} initialError={searchParams.error} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="text-xs text-zinc-500 leading-relaxed">
            New here? Ask your admin to invite you.
          </div>
          <div className="text-[10px] text-zinc-700 font-mono uppercase tracking-[0.2em]">
            VAMETRIX · v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
