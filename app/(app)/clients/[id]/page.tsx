import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';
import { requireMasterAdmin } from '@/lib/auth';
import { planFromTenant } from '@/lib/billing';
import { SERVICE_CATALOG, REQUIRED_SERVICES } from '@/lib/connections';
import { Connections } from './connections';
import { ClientControls } from './client-controls';
import { InviteAdmin } from './invite-admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadClient(id: string) {
  try {
    const supa = supabaseAdmin();
    const [{ data: tenant }, { data: creds }] = await Promise.all([
      supa.from('tenants').select('*').eq('id', id).maybeSingle(),
      supa.from('tenant_credentials').select('service,credential_key,credential_value').eq('tenant_id', id).limit(500),
    ]);
    if (!tenant) return null;

    // secret-key set per service from the catalog
    const secretKeys: Record<string, Set<string>> = {};
    for (const svc of SERVICE_CATALOG) {
      secretKeys[svc.service] = new Set(svc.fields.filter(f => f.secret).map(f => f.key));
    }

    const connected: Record<string, boolean> = {};
    const nonSecret: Record<string, Record<string, string>> = {};
    for (const row of (creds || []) as any[]) {
      if (row.credential_value == null || row.credential_value === '') continue;
      connected[row.service] = true;
      const isSecret = secretKeys[row.service]?.has(row.credential_key);
      if (!isSecret) {
        nonSecret[row.service] = nonSecret[row.service] || {};
        nonSecret[row.service][row.credential_key] = String(row.credential_value);
      }
    }

    return { tenant, connected, nonSecret };
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

export default async function Page({ params }: { params: { id: string } }) {
  await requireMasterAdmin();
  const data = await loadClient(params.id);

  if (!data) {
    return (
      <>
        <TopBar title="Client" breadcrumb="Clients" />
        <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
            Client not found. <Link href="/clients" className="underline">Back to clients</Link>
          </div>
        </div>
      </>
    );
  }

  const t = data.tenant as any;
  const plan = planFromTenant(t.plan);
  const requiredConnected = REQUIRED_SERVICES.filter(s => data.connected[s]).length;
  const requiredTotal = REQUIRED_SERVICES.length;
  const isLive = requiredConnected === requiredTotal;

  return (
    <>
      <TopBar title={t.name} breadcrumb="Clients" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="max-w-[1100px] space-y-5">
          <Link href="/clients" className="text-[11px] text-slate-500 hover:text-slate-300">← All clients</Link>

          {/* Header */}
          <div className="bg-bg-card border border-bg-border rounded-lg p-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {(t.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {t.name}
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_STYLE[t.status] || 'bg-slate-700/30 text-slate-400 border-slate-700'}`}>{t.status}</span>
                </h2>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.slug} · {plan.label} plan</div>
                {(t.primary_contact_name || t.primary_contact_email || t.whatsapp_number) && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {[t.primary_contact_name, t.primary_contact_email, t.whatsapp_number].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </div>
            <div className={`px-3 py-2 rounded-md text-xs border ${isLive ? 'bg-accent-500/10 text-accent-300 border-accent-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'}`}>
              {isLive ? '✓ Live — all required connections set' : `Setup ${requiredConnected}/${requiredTotal} required connections`}
            </div>
          </div>

          {/* Plan & status */}
          <section className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold mb-3">Plan & status</h3>
            <ClientControls tenantId={t.id} plan={plan.tier} status={t.status || 'trial'} />
          </section>

          {/* Onboarding / connections */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold">Connections</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Connect this client’s accounts. Required ones must be set before the engine can run for them.</p>
              </div>
            </div>
            <Connections tenantId={t.id} connected={data.connected} nonSecret={data.nonSecret} />
          </section>

          {/* Invite the client's own admin */}
          <section className="bg-bg-card border border-bg-border rounded-lg p-5">
            <h3 className="text-sm font-semibold">Client admin login</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
              Create a login for this client. They’ll sign in and see only their own data, scoped to this tenant.
            </p>
            <InviteAdmin tenantId={t.id} />
          </section>

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Credentials are stored per-tenant in <code className="text-slate-400">tenant_credentials</code> and read by the engine via <code className="text-slate-400">get_tenant_credentials()</code>.
            Secret fields are never shown back — leave them blank to keep the saved value. (Plaintext at rest today; encrypt with Supabase Vault before scaling.)
          </p>
        </div>
      </div>
    </>
  );
}
