import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center bg-bg">
      <div className="text-center">
        <div className="text-6xl font-bold text-slate-700">404</div>
        <p className="text-sm text-slate-400 mt-2">Page not found</p>
        <Link href="/" className="inline-block mt-4 text-xs text-accent-400 hover:text-accent-300">← Back to Engine Overview</Link>
      </div>
    </div>
  );
}
