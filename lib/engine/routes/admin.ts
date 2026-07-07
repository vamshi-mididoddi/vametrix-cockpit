// Platform admin API â€” backend for the client admin portal. This is where a
// client (tenant) connects their own WhatsApp number, Meta account, email, and
// business rules. Tokens go straight into the encrypted vault; nothing
// tenant-specific ever lives in code or .env.
//
// Auth (v0): x-admin-key header must equal ENGINE_ADMIN_KEY. Phase 1 replaces
// this with real portal auth (Supabase Auth sessions + org membership roles).
import { Hono } from 'hono';
import { db, must } from '../lib/db';
import { env } from '../lib/env';
import { orgBySlug, whatsappCreds } from '../kernel/tenants';
import { listCredentialKeys, setCredential } from '../kernel/credentials';

export const admin = new Hono();

admin.use('*', async (c, next) => {
  if (c.req.header('x-admin-key') !== env('ENGINE_ADMIN_KEY')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

// â”€â”€ Connect WhatsApp (Cloud API) for a client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Body: { phone_number, phone_number_id, waba_id?, access_token, graph_version? }
admin.post('/orgs/:slug/channels/whatsapp', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const b = await c.req.json();
  for (const field of ['phone_number', 'phone_number_id', 'access_token']) {
    if (!b[field]) return c.json({ error: `${field} is required` }, 400);
  }

  await setCredential(org.id, 'meta_whatsapp', 'access_token', b.access_token);
  await setCredential(org.id, 'meta_whatsapp', 'phone_number_id', b.phone_number_id);
  if (b.waba_id) await setCredential(org.id, 'meta_whatsapp', 'waba_id', b.waba_id);
  await setCredential(org.id, 'meta_whatsapp', 'graph_version', b.graph_version ?? 'v22.0');

  const { data: existing } = await db.from('sales_channels')
    .select('id').eq('org_id', org.id).eq('type', 'whatsapp').limit(1).maybeSingle();
  if (existing) {
    await db.from('sales_channels').update({
      identifier: b.phone_number, provider: 'wa_cloud', credentials_ref: 'vault:meta_whatsapp', active: true,
    }).eq('id', existing.id);
  } else {
    must(await db.from('sales_channels').insert({
      org_id: org.id, type: 'whatsapp', provider: 'wa_cloud',
      identifier: b.phone_number, credentials_ref: 'vault:meta_whatsapp',
    }).select('id').single(), 'insert channel');
  }

  // Verify the credentials actually work before declaring success.
  try {
    const creds = await whatsappCreds(org.id);
    const res = await fetch(`https://graph.facebook.com/${creds.graphVersion}/${creds.phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${creds.token}` },
    });
    const info = await res.json();
    if (!res.ok) return c.json({ connected: false, verify_error: info.error?.message ?? 'unknown' }, 422);
    return c.json({ connected: true, number: info.display_phone_number, verified_name: info.verified_name });
  } catch (e) {
    return c.json({ connected: false, verify_error: (e as Error).message }, 422);
  }
});

// â”€â”€ Update a client's business rules (validated shape lives in config/) â”€â”€
admin.put('/orgs/:slug/config', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const config = await c.req.json();
  const { error } = await db.from('sales_orgs').update({ config }).eq('id', org.id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ updated: true });
});

// â”€â”€ Generic integration connect: client pastes THEIR credentials â”€â”€
// Body: { "access_token": "...", "pixel_id": "..." } â†’ all stored encrypted.
// Services: meta_ads (needs leads_retrieval for forms), meta_capi, smtp, zoho_crm
admin.post('/orgs/:slug/credentials/:service', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const service = c.req.param('service');
  const body = await c.req.json();
  const keys = Object.keys(body).filter(k => typeof body[k] === 'string' && body[k].length);
  if (!keys.length) return c.json({ error: 'no credential fields provided' }, 400);
  for (const key of keys) await setCredential(org.id, service, key, body[key]);
  return c.json({ connected: service, keys });
});

// â”€â”€ Lead form integrations (Meta instant forms) â€” client-managed â”€â”€
admin.get('/orgs/:slug/leadgen-forms', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  return c.json({ forms: org.config?.leadgen_forms ?? [] });
});

admin.post('/orgs/:slug/leadgen-forms', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const { form_id, page_id, label } = await c.req.json();
  if (!form_id) return c.json({ error: 'form_id is required' }, 400);
  // Verify the client's own token can actually read this form before saving.
  const { getServiceCredentials } = await import('../kernel/credentials');
  const creds = await getServiceCredentials(org.id, 'meta_ads');
  if (!creds.access_token) {
    return c.json({ error: 'connect meta_ads credentials first (needs leads_retrieval permission)' }, 422);
  }
  const test = await fetch(`https://graph.facebook.com/v22.0/${form_id}/leads?fields=id&limit=1&access_token=${creds.access_token}`)
    .then(r => r.json());
  if (test.error) return c.json({ error: `form not readable with your token: ${test.error.message}` }, 422);

  const forms = (org.config?.leadgen_forms ?? []).filter((f: any) => f.form_id !== form_id);
  forms.push({ form_id, page_id: page_id ?? null, label: label ?? null });
  await db.from('sales_orgs').update({ config: { ...org.config, leadgen_forms: forms } }).eq('id', org.id);
  return c.json({ added: form_id, forms });
});

admin.delete('/orgs/:slug/leadgen-forms/:formId', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const forms = (org.config?.leadgen_forms ?? []).filter((f: any) => f.form_id !== c.req.param('formId'));
  await db.from('sales_orgs').update({ config: { ...org.config, leadgen_forms: forms } }).eq('id', org.id);
  return c.json({ removed: c.req.param('formId'), forms });
});

// â”€â”€ Knowledge management â€” client-managed â”€â”€
admin.get('/orgs/:slug/kb', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const { data } = await db.from('sales_kb_documents')
    .select('id,title,source_type,status,created_at')
    .eq('org_id', org.id).order('created_at', { ascending: false });
  return c.json({ documents: data ?? [] });
});

admin.delete('/orgs/:slug/kb/:docId', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const { error } = await db.from('sales_kb_documents')
    .delete().eq('org_id', org.id).eq('id', c.req.param('docId'));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ deleted: c.req.param('docId') });
});

// â”€â”€ Product catalog / verticals â€” client-managed â”€â”€
admin.get('/orgs/:slug/products', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const { data } = await db.from('sales_products')
    .select('id,sku,name,description,specs,unit,currency,list_price,min_price,moq,active')
    .eq('org_id', org.id).order('sku');
  return c.json({ products: data ?? [] });
});

admin.post('/orgs/:slug/products', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const b = await c.req.json();
  for (const field of ['sku', 'name', 'list_price', 'min_price']) {
    if (b[field] === undefined) return c.json({ error: `${field} is required` }, 400);
  }
  const { data, error } = await db.from('sales_products').upsert({
    org_id: org.id, sku: b.sku, name: b.name, description: b.description ?? null,
    specs: b.specs ?? {}, unit: b.unit ?? 'unit', currency: b.currency ?? 'INR',
    list_price: b.list_price, min_price: b.min_price, moq: b.moq ?? 1,
    active: b.active ?? true,
  }, { onConflict: 'org_id,sku' }).select('id,sku').single();
  if (error) return c.json({ error: error.message }, 422);
  return c.json({ saved: data });
});

admin.delete('/orgs/:slug/products/:sku', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const { error } = await db.from('sales_products')
    .update({ active: false }).eq('org_id', org.id).eq('sku', c.req.param('sku'));
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ deactivated: c.req.param('sku') });
});

// â”€â”€ Portal overview: what's connected for this client (no secret values) â”€â”€
admin.get('/orgs/:slug/overview', async c => {
  const org = await orgBySlug(c.req.param('slug'));
  const [channels, creds, counts] = await Promise.all([
    db.from('sales_channels').select('type,provider,identifier,active').eq('org_id', org.id),
    listCredentialKeys(org.id),
    db.from('sales_leads').select('status').eq('org_id', org.id),
  ]);
  const pipeline: Record<string, number> = {};
  for (const l of counts.data ?? []) pipeline[l.status] = (pipeline[l.status] ?? 0) + 1;
  return c.json({
    org: { slug: org.slug, name: org.name, status: org.status },
    channels: channels.data ?? [],
    connected_services: creds.reduce<Record<string, string[]>>((acc, r) => {
      (acc[r.service] ??= []).push(r.key);
      return acc;
    }, {}),
    pipeline,
  });
});
