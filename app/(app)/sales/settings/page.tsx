// VAMETRIX Sales OS â€” Client Settings: everything the client edits themselves.
// Knowledge Â· Catalog Â· Integrations (WhatsApp / Meta ads token / lead forms).
// Server actions call the embedded engine's own functions â€” one code path.
import { revalidatePath } from 'next/cache';
import { defaultOrg, salesDb } from '@/lib/salesos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// â”€â”€ Server actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function addKnowledge(formData: FormData) {
  'use server';
  const { loadDocument } = await import('@/lib/engine/modules/sales/kb');
  const org = await defaultOrg();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (title && content) await loadDocument(org as any, { title, content });
  revalidatePath('/sales/settings');
}

async function deleteKnowledge(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  await salesDb().from('sales_kb_documents').delete()
    .eq('org_id', org.id).eq('id', String(formData.get('id')));
  revalidatePath('/sales/settings');
}

async function saveProduct(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  if (!f('sku') || !f('name')) return;
  await salesDb().from('sales_products').upsert({
    org_id: org.id, sku: f('sku'), name: f('name'), description: f('description') || null,
    unit: f('unit') || 'unit', currency: 'INR',
    list_price: Number(f('list_price') || 0), min_price: Number(f('min_price') || 0),
    moq: Number(f('moq') || 1), active: true,
    specs: f('vertical') ? { vertical: f('vertical') } : {},
  }, { onConflict: 'org_id,sku' });
  revalidatePath('/sales/settings');
}

async function deactivateProduct(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  await salesDb().from('sales_products').update({ active: false })
    .eq('org_id', org.id).eq('sku', String(formData.get('sku')));
  revalidatePath('/sales/settings');
}

async function connectMetaAds(formData: FormData) {
  'use server';
  const { setCredential } = await import('@/lib/engine/kernel/credentials');
  const org = await defaultOrg();
  const token = String(formData.get('access_token') ?? '').trim();
  if (token) await setCredential(org.id, 'meta_ads', 'access_token', token);
  revalidatePath('/sales/settings');
}

async function addVertical(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const verticals = (org.config?.verticals ?? []).filter((v: any) => v.id !== id);
  verticals.push({ id, name });
  await salesDb().from('sales_orgs').update({ config: { ...org.config, verticals } }).eq('id', org.id);
  revalidatePath('/sales/settings');
}

async function removeVertical(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const verticals = (org.config?.verticals ?? []).filter((v: any) => v.id !== String(formData.get('id')));
  await salesDb().from('sales_orgs').update({ config: { ...org.config, verticals } }).eq('id', org.id);
  revalidatePath('/sales/settings');
}

async function addLeadForm(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const form_id = String(formData.get('form_id') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  if (!form_id) return;
  const forms = (org.config?.leadgen_forms ?? []).filter((f: any) => f.form_id !== form_id);
  forms.push({ form_id, label: label || null });
  await salesDb().from('sales_orgs').update({ config: { ...org.config, leadgen_forms: forms } }).eq('id', org.id);
  revalidatePath('/sales/settings');
}

async function removeLeadForm(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const forms = (org.config?.leadgen_forms ?? []).filter((f: any) => f.form_id !== String(formData.get('form_id')));
  await salesDb().from('sales_orgs').update({ config: { ...org.config, leadgen_forms: forms } }).eq('id', org.id);
  revalidatePath('/sales/settings');
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inputCls = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30';
const btnCls = 'px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-medium transition';
const cardCls = 'rounded-xl border border-white/10 bg-white/[0.03] p-5';

export default async function SalesSettingsPage() {
  const org = await defaultOrg();
  const db = salesDb();
  const [{ data: docs }, { data: products }, { data: channels }, { data: creds }, { data: templates }] = await Promise.all([
    db.from('sales_kb_documents').select('id,title,status,created_at').eq('org_id', org.id).order('created_at', { ascending: false }),
    db.from('sales_products').select('sku,name,unit,list_price,min_price,moq,active').eq('org_id', org.id).order('sku'),
    db.from('sales_channels').select('type,provider,identifier,active').eq('org_id', org.id),
    db.from('sales_credentials').select('service,key,updated_at').eq('org_id', org.id),
    db.from('sales_templates').select('name,purpose,status').eq('org_id', org.id).order('created_at', { ascending: false }).limit(8),
  ]);
  const forms = org.config?.leadgen_forms ?? [];
  const connectedServices = [...new Set((creds ?? []).map(c => c.service))];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">VAMETRIX Sales OS Â· {org.name}</div>
        <h1 className="text-2xl font-semibold text-white mt-1">Client Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Everything here belongs to the client and changes the AI instantly.</p>
      </div>

      {/* Integrations */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-4">Integrations</h2>
        <div className="space-y-3 text-sm">
          {(channels ?? []).map(ch => (
            <div key={ch.type} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${ch.identifier && !ch.identifier.startsWith('REPLACE') ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <span className="text-zinc-200 capitalize w-32">{ch.type.replace('_', ' ')}</span>
              <span className="text-zinc-400 font-mono text-xs">{ch.identifier}</span>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${connectedServices.includes('meta_ads') ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            <span className="text-zinc-200 w-32">Meta Ads token</span>
            <span className="text-zinc-500 text-xs">{connectedServices.includes('meta_ads') ? 'connected' : 'needed for instant-form leads (leads_retrieval permission)'}</span>
          </div>
        </div>
        <form action={connectMetaAds} className="mt-4 flex gap-2">
          <input name="access_token" placeholder="Paste Meta access token (leads_retrieval scope)" className={inputCls} />
          <button className={btnCls}>Connect</button>
        </form>
      </div>

      {/* Verticals */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-1">Verticals</h2>
        <p className="text-xs text-zinc-500 mb-4">Business lines (e.g. D&apos;Cal, Low-GI Rice). Tag products with a vertical so the AI recommends within the right line.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(org.config?.verticals ?? []).map((v: any) => (
            <form key={v.id} action={removeVertical} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm">
              <input type="hidden" name="id" value={v.id} />
              <span className="text-zinc-200">{v.name}</span>
              <button className="text-red-400 hover:text-red-300 text-xs">×</button>
            </form>
          ))}
          {(org.config?.verticals ?? []).length === 0 && <span className="text-sm text-zinc-500">None yet</span>}
        </div>
        <form action={addVertical} className="flex gap-2">
          <input name="name" placeholder="Vertical name (e.g. Low-GI Rice)" className={inputCls} />
          <button className={btnCls}>Add vertical</button>
        </form>
      </div>

      {/* Lead forms */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-1">Lead Forms (Meta instant forms)</h2>
        <p className="text-xs text-zinc-500 mb-4">New form submissions become AI conversations automatically.</p>
        <div className="space-y-2 mb-4">
          {forms.map((f: any) => (
            <form key={f.form_id} action={removeLeadForm} className="flex items-center gap-3 text-sm">
              <input type="hidden" name="form_id" value={f.form_id} />
              <span className="text-zinc-200">{f.label ?? 'form'}</span>
              <span className="text-zinc-500 font-mono text-xs">{f.form_id}</span>
              <button className="text-red-400 hover:text-red-300 text-xs">remove</button>
            </form>
          ))}
          {forms.length === 0 && <div className="text-sm text-zinc-500">No forms connected</div>}
        </div>
        <form action={addLeadForm} className="flex gap-2">
          <input name="form_id" placeholder="Form ID" className={inputCls} />
          <input name="label" placeholder="Label (e.g. rice-dealer)" className={inputCls} />
          <button className={btnCls}>Add</button>
        </form>
      </div>

      {/* Knowledge */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-1">Company Knowledge</h2>
        <p className="text-xs text-zinc-500 mb-4">The AI answers customers ONLY from what is here.</p>
        <div className="space-y-2 mb-4">
          {(docs ?? []).map(d => (
            <form key={d.id} action={deleteKnowledge} className="flex items-center gap-3 text-sm">
              <input type="hidden" name="id" value={d.id} />
              <span className={`w-2 h-2 rounded-full ${d.status === 'indexed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-zinc-200 flex-1">{d.title}</span>
              <button className="text-red-400 hover:text-red-300 text-xs">delete</button>
            </form>
          ))}
        </div>
        <form action={addKnowledge} className="space-y-2">
          <input name="title" placeholder="Document title (e.g. Shipping Policy)" className={inputCls} />
          <textarea name="content" rows={4} placeholder="Paste the knowledge text â€” FAQs, policies, product detailsâ€¦" className={inputCls} />
          <button className={btnCls}>Add to knowledge base</button>
        </form>
      </div>

      {/* Catalog */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-1">Product Catalog</h2>
        <p className="text-xs text-zinc-500 mb-4">Floor price is the AI&apos;s hard negotiation limit â€” it can never quote below it.</p>
        <div className="space-y-2 mb-4">
          {(products ?? []).filter(p => p.active).map(p => (
            <form key={p.sku} action={deactivateProduct} className="flex items-center gap-3 text-sm">
              <input type="hidden" name="sku" value={p.sku} />
              <span className="text-zinc-200 flex-1">{p.name} <span className="text-zinc-500 font-mono text-xs">({p.sku})</span></span>
              <span className="text-zinc-400">â‚¹{Number(p.list_price).toLocaleString()} / floor â‚¹{Number(p.min_price).toLocaleString()} / MOQ {p.moq}</span>
              <button className="text-red-400 hover:text-red-300 text-xs">remove</button>
            </form>
          ))}
          {(products ?? []).filter(p => p.active).length === 0 && (
            <div className="text-sm text-amber-400/80">âš  No active products â€” the AI cannot generate quotes until the catalog is added.</div>
          )}
        </div>
        <form action={saveProduct} className="grid grid-cols-2 md:grid-cols-7 gap-2">
          <input name="sku" placeholder="SKU" className={inputCls} />
          <input name="name" placeholder="Product name" className={inputCls} />
          <input name="list_price" placeholder="List â‚¹" className={inputCls} />
          <input name="min_price" placeholder="Floor â‚¹" className={inputCls} />
          <input name="moq" placeholder="MOQ" className={inputCls} />
          <input name="vertical" placeholder="Vertical" className={inputCls} />
          <button className={btnCls}>Add</button>
        </form>
      </div>

      {/* Templates (read-only status) */}
      <div className={cardCls}>
        <h2 className="text-lg font-medium text-white mb-1">WhatsApp Templates</h2>
        <p className="text-xs text-zinc-500 mb-4">Written by the AI in your brand voice, approved by Meta, used automatically.</p>
        <div className="space-y-2 text-sm">
          {(templates ?? []).map(t => (
            <div key={t.name} className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${t.status === 'approved' ? 'bg-emerald-500' : t.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-zinc-200">{t.purpose}</span>
              <span className="text-zinc-500 font-mono text-xs flex-1">{t.name}</span>
              <span className="text-zinc-400 text-xs">{t.status}</span>
            </div>
          ))}
          {(templates ?? []).length === 0 && <div className="text-zinc-500">None yet â€” the AI creates them when first needed.</div>}
        </div>
      </div>
    </div>
  );
}
