// Instant skeleton shown the moment you click any cockpit nav link, while the (dynamic,
// US-rendered) page loads. The AppShell sidebar persists (it's in the layout); this only
// fills the content area — so navigation feels instant instead of frozen. Next also
// prefetches this boundary for <Link>s, so the skeleton appears with zero perceived delay.
export default function Loading() {
  return (
    <>
      {/* TopBar skeleton */}
      <div className="h-[52px] shrink-0 border-b border-bg-border bg-bg-card/40 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-24 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-3.5 w-3.5 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-40 rounded bg-white/[0.08] animate-pulse" />
        </div>
        <div className="h-7 w-7 rounded-full bg-white/[0.06] animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-hidden bg-bg p-6">
        <div className="max-w-5xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-3 w-72 rounded bg-white/[0.04] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg border border-bg-border bg-bg-card/40 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="h-72 rounded-lg border border-bg-border bg-bg-card/40 animate-pulse" />
        </div>
      </div>
    </>
  );
}
