// VAMETRIX Sales — Client onboarding (platform operator view).
// Creating a client = one form. Everything else the client configures
// themselves in Client Settings (self-serve rule).
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { salesDb, requirePlatformAdmin } from '@/lib/salesos';

export const dynamic = 'force-dynamic';

async function switchToClient(formData: FormData) {
  'use server';
  await requirePlatformAdmin();
  cookies().set('vmx_org', String(formData.get('slug')), { path: '/', maxAge: 60 * 60 * 24 * 30 });
  revalidatePath('/sales');
  revalidatePath('/sales/clients');
}

async function createClientOrg(formData: FormData) {
  'use server';
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!name) return;
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const db = salesDb();
  await db.from('sales_orgs').insert({
    slug,
    name,
    status: 'active',
    timezone: 'Asia/Kolkata',
    branding: { sender_name: `${name} Sales`, signature: `Team ${name}` },
    config: {
      languages: ['en'],
      working_hours: { start: '09:00', end: '19:00', days: [1, 2, 3, 4, 5, 6] },
      qualification: {
        questions: [
          { id: 'intent', ask: 'What product/service are you looking for?', weight: 30 },
          { id: 'quantity', ask: 'What quantity / order size do you need?', weight: 30 },
          { id: 'timeline', ask: 'When do you need it?', weight: 20 },
          { id: 'location', ask: 'Where should it be delivered?', weight: 20 },
        ],
        qualified_threshold: 60,
        disqualify_if: ['job seeker', 'vendor pitching services'],
      },
      negotiation: { max_discount_pct: 10, payment_terms_allowed: ['100% advance', '50% advance'] },
      escalation: { triggers: ['explicit_request', 'complaint', 'legal_or_compliance'] },
      followup_cadence_hours: [4, 24, 72, 168],
      dormant_after_days: 7,
      quote_valid_days: 15,
      verticals: [],
    },
  });
  revalidatePath('/sales/clients');
}

const inputCls = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30';

export default async function ClientsPage() {
  await requirePlatformAdmin(); // super-admin only — clients never see this page
  const active = cookies().get('vmx_org')?.value;
  const db = salesDb();
  const { data: orgs } = await db.from('sales_orgs')
    .select('id,slug,name,status,created_at,config')
    .order('created_at');

  const counts: Record<string, number> = {};
  for (const o of orgs ?? []) {
    const { count } = await db.from('sales_leads').select('id', { count: 'exact', head: true }).eq('org_id', o.id);
    counts[o.id] = count ?? 0;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">VAMETRIX Sales OS · Platform</div>
        <h1 className="text-2xl font-semibold text-white mt-1">Clients</h1>
        <p className="text-sm text-zinc-400 mt-1">Onboard a company in one step — they configure everything else in their own settings.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-medium text-white mb-4">Onboard new client</h2>
        <form action={createClientOrg} className="flex gap-2">
          <input name="name" placeholder="Company name (e.g. Acme Exports)" className={inputCls} required />
          <input name="slug" placeholder="slug (auto if empty)" className={inputCls} />
          <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition shrink-0">
            Create client
          </button>
        </form>
        <p className="text-xs text-zinc-500 mt-3">
          Created with sensible defaults (qualification questions, 10% discount authority, follow-up cadence).
          Next steps happen in the client&apos;s own settings: connect WhatsApp, knowledge, catalog, verticals, forms.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200">All clients</div>
        <div className="divide-y divide-white/5">
          {(orgs ?? []).map(o => (
            <div key={o.id} className="px-4 py-3 flex items-center justify-between text-sm">
              <div>
                <span className="text-white">{o.name}</span>
                <span className="text-zinc-500 font-mono text-xs ml-2">{o.slug}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-xs">{(o.config?.verticals ?? []).length} verticals</span>
                <span className="text-zinc-400 text-xs">{counts[o.id]} leads</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-600/30 text-zinc-400'}`}>
                  {o.status}
                </span>
                <form action={switchToClient}>
                  <input type="hidden" name="slug" value={o.slug} />
                  <button className={`text-xs px-3 py-1.5 rounded-lg transition ${active === o.slug ? 'bg-emerald-500/20 text-emerald-300 cursor-default' : 'bg-white/10 hover:bg-white/15 text-zinc-200'}`}>
                    {active === o.slug ? '● Managing' : 'Manage'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
