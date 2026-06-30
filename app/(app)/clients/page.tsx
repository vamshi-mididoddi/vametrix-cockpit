import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireMasterAdmin } from '@/lib/auth';
import { planFromTenant } from '@/lib/billing';
import { AddClient } from './add-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ClientRow {
  id: string; slug: string; name: string; plan: string | null; status: string | null;
  primary_contact_name: string | null; primary_contact_email: string | null;
  whatsapp_number: string | null; onboarding_step: string | null; created_at: string | null;
}

async function loadClients(): Promise<ClientRow[] | null> {
  try {
    const supa = supabaseAdmin();
    const { data } = await supa
      .from('tenants')
      .select('id,slug,name,plan,status,primary_contact_name,primary_contact_email,whatsapp_number,onboarding_step,created_at')
      .order('created_at', { ascending: true })
      .limit(500);
    return (data as ClientRow[]) || [];
  } catch {
    return null;
  }
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-accent-500/10 text-accent-300 border-accent-500/30',
  trial: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  paused: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  churned: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

export default async function Page() {
  const user = await requireMasterAdmin();
  const clients = await loadClients();

  const activeCount = (clients || []).filter(c => c.status === 'active').length;
  const trialCount = (clients || []).filter(c => c.status === 'trial').length;

  return (
    <>
      <TopBar title="Clients" breadcrumb={user.tenant_name || 'Vametrix'} />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-[1300px] space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Clients</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every company running on the Vametrix Engine. {clients ? `${clients.length} total · ${activeCount} active · ${trialCount} trial.` : ''}
              </p>
            </div>
            <AddClient />
          </div>

          {!clients ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
              <strong>Couldn’t load clients.</strong> Check the Supabase connection.
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-bg-card/40 border border-dashed border-bg-border rounded-lg p-10 text-center text-sm text-slate-400">
              No clients yet. Add your first one above.
            </div>
          ) : (
            <section className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-bg-border bg-bg-soft/40">
                      <th className="text-left font-medium py-2.5 px-4">Client</th>
                      <th className="text-left font-medium py-2.5 px-3">Contact</th>
                      <th className="text-left font-medium py-2.5 px-3">Plan</th>
                      <th className="text-left font-medium py-2.5 px-3">Status</th>
                      <th className="text-left font-medium py-2.5 px-3">Onboarding</th>
                      <th className="text-right font-medium py-2.5 px-4">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c, i) => {
                      const plan = planFromTenant(c.plan);
                      return (
                        <tr key={c.id} className="border-b border-bg-border/50 last:border-0 hover:bg-bg-soft/40 transition">
                          <td className="py-3 px-4">
                            <Link href={`/clients/${c.id}`} className="flex items-center gap-2.5 group">
                              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                                {(c.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-100 truncate flex items-center gap-1.5 group-hover:text-accent-300 transition">
                                  {c.name}
                                  {i === 0 && <span className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">#1</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">{c.slug}</div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            <div className="truncate">{c.primary_contact_name || '—'}</div>
                            <div className="text-[10px] text-slate-600 truncate">{c.primary_contact_email || c.whatsapp_number || ''}</div>
                          </td>
                          <td className="py-3 px-3"><span className="text-slate-300">{plan.label}</span></td>
                          <td className="py-3 px-3">
                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status || ''] || 'bg-slate-700/30 text-slate-400 border-slate-700'}`}>
                              {c.status || 'unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">{(c.onboarding_step || '—').replace(/_/g, ' ')}</td>
                          <td className="py-3 px-4 text-right text-slate-500 text-[11px] tabular-nums">{fmtDate(c.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Vametrix Engine is the product; each client is a tenant with isolated data. New clients start on a trial.
            After creating a client, connect their Meta / WhatsApp / OpenRouter credentials and invite their team to fully activate them.
          </p>
        </div>
      </div>
    </>
  );
}
