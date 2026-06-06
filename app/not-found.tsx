import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-7xl font-bold text-bg-border">404</div>
        <p className="text-sm text-zinc-400 mt-3">This page doesn't exist.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="text-xs px-4 py-2 rounded-md border border-bg-border hover:bg-bg-card text-zinc-300 transition">← Home</Link>
          <Link href="/dashboard" className="text-xs px-4 py-2 rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 transition">Go to dashboard →</Link>
        </div>
      </div>
    </div>
  );
}
