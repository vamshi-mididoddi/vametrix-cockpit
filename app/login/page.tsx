import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const u = await getCurrentUser();
  if (u) redirect(searchParams.next || '/');
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-violet-500/5 pointer-events-none" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl shadow-accent-500/20">V</div>
          <div>
            <div className="text-xl font-semibold tracking-tight">Vametrix Engine</div>
            <div className="text-[11px] text-slate-500 font-mono">AI sales + marketing · autonomous</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-bg-border rounded-2xl p-7 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-5">
            <h1 className="text-base font-semibold">Welcome back</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Sign in to access your engine cockpit.</p>
          </div>
          <LoginForm nextPath={searchParams.next || '/'} initialError={searchParams.error} />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
          New user? Ask your admin to send you credentials,<br/>
          or click <span className="text-slate-400">First time?</span> if this is the very first sign-up.
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-700 font-mono uppercase tracking-widest">
          v1.0 · powered by Vametrix
        </div>
      </div>
    </div>
  );
}
