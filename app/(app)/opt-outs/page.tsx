import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function load() {
  const supa = supabaseAdmin();
  const { data } = await supa
    .from('lead_opt_outs')
    .select('*')
    .order('opted_out_at', { ascending: false })
    .limit(500);
  return (data || []) as any[];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function Page() {
  await requireAdmin();
  const optOuts = await load();
  return (
    <>
      <TopBar title="Opt-outs" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-5xl">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">{optOuts.length} opted-out contacts</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              These phones are excluded from all engine outbound (qualifier, smart follow-up, broadcasts).
              Added when the customer sends STOP / UNSUBSCRIBE / REMOVE / cancel keywords on WhatsApp, or via cockpit manual.
            </p>
          </div>

          {optOuts.length === 0 ? (
            <div className="bg-bg-card border border-bg-border rounded-lg p-6 text-center text-sm text-slate-500 italic">
              No opt-outs yet. (When a customer replies STOP, they auto-land here.)
            </div>
          ) : (
            <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-soft border-b border-bg-border">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="text-left py-2 px-3">Phone</th>
                    <th className="text-left py-2 px-3">When</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-left py-2 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {optOuts.map(o => (
                    <tr key={o.phone} className="border-b border-bg-border hover:bg-bg-cardhover">
                      <td className="py-2 px-3 text-xs font-mono">{o.phone}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-400">{fmtTime(o.opted_out_at)}</td>
                      <td className="py-2 px-3 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase">{o.source || 'unknown'}</span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-400 max-w-md truncate">{o.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
            ⚠ Legal + Meta policy: never message opted-out contacts. Re-opting-in requires the customer to message you first.
          </div>
        </div>
      </div>
    </>
  );
}
