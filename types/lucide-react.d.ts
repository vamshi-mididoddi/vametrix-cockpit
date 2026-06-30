// Type shim for lucide-react.
// lucide-react ships its declarations under "typings" (dist/lucide-react.d.ts),
// but its package.json lacks an "exports" types condition, so tsc with
// moduleResolution "bundler" resolves the CJS entry and reports TS7016.
// The codebase already treats icons loosely (e.g. `(Icons as any)[name]` and
// mixed named / namespace imports), so declare the module permissively.
// This is the fix TypeScript itself suggests for this case.
declare module 'lucide-react';
