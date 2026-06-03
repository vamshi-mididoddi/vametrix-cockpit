import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './form';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const u = await getCurrentUser();
  if (u) redirect(searchParams.next || '/');
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xl">V</div>
          <div>
            <div className="text-lg font-semibold tracking-tight">Vametrix Engine</div>
            <div className="text-[11px] text-slate-500 font-mono">cockpit · sign in</div>
          </div>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-lg p-6">
          <LoginForm nextPath={searchParams.next || '/'} initialError={searchParams.error} />
        </div>
        <div className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed">
          Don't have an account? Ask your admin to create one for you,<br/>
          or sign up below if this is the first deploy.
        </div>
      </div>
    </div>
  );
}
