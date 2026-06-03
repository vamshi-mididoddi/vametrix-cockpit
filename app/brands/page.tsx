import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const [{ data: brands }, { data: completeness }] = await Promise.all([
    supa.from('brand_profiles').select('brand_key,brand_label,one_liner,active,updated_at').order('brand_key'),
    supa.rpc('brand_profile_completeness'),
  ]);
  return { brands: brands || [], completeness: completeness || [] };
}

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function Page() {
  await requireAdmin();
  const { brands, completeness } = await load();
  const compByKey: Record<string, any> = {};
  for (const c of completeness) compByKey[c.brand_key] = c;

  return (
    <>
      <TopBar title="Brand Context" breadcrumb="Marketing Brain · ICP store" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-5xl">
          <div className="mb-6">
            <h3 className="text-sm font-semibold">Brand profiles</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
              Every plan the strategist (#87) builds and every creative the factory (#88) generates is grounded in these profiles.
              Fill once. The higher the completion %, the smarter the marketing brain becomes for that brand.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {brands.map(b => {
              const c = compByKey[b.brand_key] || {};
              const pct = c.completion_pct || 0;
              const color = pct >= 75 ? 'text-accent-400' : pct >= 40 ? 'text-amber-400' : 'text-rose-400';
              const bar = pct >= 75 ? 'bg-accent-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
              return (
                <Link key={b.brand_key} href={`/brands/${b.brand_key}`}
                  className="bg-bg-card border border-bg-border hover:border-accent-500/30 rounded-lg p-5 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs font-mono text-slate-500">{b.brand_key}</div>
                      <h3 className="text-sm font-semibold mt-0.5">{b.brand_label}</h3>
                    </div>
                    <span className={`text-2xl font-semibold tabular-nums ${color}`}>{pct}%</span>
                  </div>

                  <p className="text-[11px] text-slate-400 italic mb-3 line-clamp-2">{b.one_liner || '— set one-liner —'}</p>

                  <div className="w-full bg-bg-soft rounded-full h-1.5 mb-3 overflow-hidden">
                    <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[9px]">
                    {[
                      ['One-liner', c.one_liner_filled],
                      ['ICP', c.icp_filled],
                      ['Voice', c.voice_filled],
                      ['Products', c.products_filled],
                      ['Customers', c.customers_filled],
                      ['Past data', c.past_filled],
                      ['Constraints', c.constraints_filled],
                      ['Tech IDs', c.tech_filled],
                    ].map(([label, filled]: any) => (
                      <span key={label}
                        className={`uppercase tracking-wider text-center px-1 py-0.5 rounded border ${filled ? 'border-accent-500/30 text-accent-300 bg-accent-500/5' : 'border-bg-border text-slate-600'}`}>
                        {filled ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-600 mt-3">Updated {fmt(b.updated_at)}</div>
                </Link>
              );
            })}
          </div>

          {brands.length === 0 && (
            <div className="bg-bg-card border border-bg-border border-dashed rounded-lg p-12 text-center">
              <div className="text-sm text-slate-400 mb-2">No brand profiles found.</div>
              <div className="text-[11px] text-slate-500">Run <code className="font-mono">schema/010-brand-profiles.sql</code> in Supabase SQL Editor first.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
