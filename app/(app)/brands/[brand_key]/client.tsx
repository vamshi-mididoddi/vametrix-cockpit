'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateBrandProfile, applyTemplate } from '../actions';

type B = any;

export function BrandEditorClient({ brand }: { brand: B }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Top-level fields
  const [brandLabel, setBrandLabel] = useState(brand.brand_label || '');
  const [oneLiner, setOneLiner] = useState(brand.one_liner || '');

  // JSON fields kept as JSON strings for the textarea editor — typed-in markup, validated on save
  const [icpStr, setIcpStr] = useState(JSON.stringify(brand.icp || {}, null, 2));
  const [voiceStr, setVoiceStr] = useState(JSON.stringify(brand.voice || {}, null, 2));
  const [productsStr, setProductsStr] = useState(JSON.stringify(brand.products || [], null, 2));
  const [cohortsStr, setCohortsStr] = useState(JSON.stringify(brand.customer_cohorts || [], null, 2));
  const [winnersStr, setWinnersStr] = useState(JSON.stringify(brand.past_winners || [], null, 2));
  const [losersStr, setLosersStr] = useState(JSON.stringify(brand.past_losers || [], null, 2));
  const [competitorsStr, setCompetitorsStr] = useState(JSON.stringify(brand.competitor_examples || [], null, 2));
  const [constraintsStr, setConstraintsStr] = useState(JSON.stringify(brand.constraints || {}, null, 2));

  // Tech IDs
  const [metaPixel, setMetaPixel] = useState(brand.meta_pixel_id || '');
  const [metaDataset, setMetaDataset] = useState(brand.meta_dataset_id || '');
  const [metaPage, setMetaPage] = useState(brand.meta_page_id || '');
  const [metaIg, setMetaIg] = useState(brand.meta_instagram_id || '');
  const [ga4Prop, setGa4Prop] = useState(brand.ga4_property_id || '');
  const [ga4Meas, setGa4Meas] = useState(brand.ga4_measurement_id || '');
  const [gtm, setGtm] = useState(brand.gtm_container_id || '');
  const [landing, setLanding] = useState(brand.landing_page_url || '');
  const [waNum, setWaNum] = useState(brand.whatsapp_number || '');

  function show(msg: string, err = false) {
    setFeedback((err ? '✗ ' : '✓ ') + msg);
    setTimeout(() => setFeedback(null), 6000);
  }

  function tryParse(label: string, str: string, fallback: any): any | null {
    try { return JSON.parse(str); }
    catch (e: any) { show(`JSON error in ${label}: ${e?.message}`, true); return null; }
  }

  function saveAll() {
    const icp = tryParse('ICP', icpStr, {}); if (!icp) return;
    const voice = tryParse('Voice', voiceStr, {}); if (!voice) return;
    const products = tryParse('Products', productsStr, []); if (!products) return;
    const cohorts = tryParse('Customer cohorts', cohortsStr, []); if (!cohorts) return;
    const winners = tryParse('Past winners', winnersStr, []); if (!winners) return;
    const losers = tryParse('Past losers', losersStr, []); if (!losers) return;
    const competitors = tryParse('Competitor examples', competitorsStr, []); if (!competitors) return;
    const constraints = tryParse('Constraints', constraintsStr, {}); if (!constraints) return;

    startTransition(async () => {
      const r = await updateBrandProfile(brand.brand_key, {
        brand_label: brandLabel,
        one_liner: oneLiner,
        icp, voice, products,
        customer_cohorts: cohorts,
        past_winners: winners, past_losers: losers,
        competitor_examples: competitors,
        constraints,
        meta_pixel_id: metaPixel || null,
        meta_dataset_id: metaDataset || null,
        meta_page_id: metaPage || null,
        meta_instagram_id: metaIg || null,
        ga4_property_id: ga4Prop || null,
        ga4_measurement_id: ga4Meas || null,
        gtm_container_id: gtm || null,
        landing_page_url: landing || null,
        whatsapp_number: waNum || null,
      });
      if (r.ok) { show('Saved'); router.refresh(); }
      else show(r.error || 'failed', true);
    });
  }

  function applyTpl(template: 'b2b_softener' | 'b2c_dtc' | 'b2b_imports') {
    if (!confirm(`Apply ${template} template? This OVERWRITES current ICP + Voice. Other sections untouched.`)) return;
    startTransition(async () => {
      const r = await applyTemplate(brand.brand_key, template);
      if (r.ok) { show('Template applied — reloading'); setTimeout(() => router.refresh(), 600); }
      else show(r.error || 'failed', true);
    });
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/brands" className="text-[11px] text-slate-500 hover:text-slate-300">← All brands</Link>
        <span className="text-slate-700">·</span>
        <code className="text-[11px] font-mono text-slate-500">{brand.brand_key}</code>
      </div>

      {feedback && (
        <div className={`text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>
      )}

      {/* Quick templates */}
      <div className="bg-bg-card border border-bg-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold">Quick-fill templates</h3>
            <p className="text-[11px] text-slate-500">Pre-built ICP + Voice for common shapes. You can edit any field after applying.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => applyTpl('b2b_softener')} disabled={pending} className="px-3 py-1.5 text-xs rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20">B2B Softener Installer</button>
          <button onClick={() => applyTpl('b2c_dtc')} disabled={pending} className="px-3 py-1.5 text-xs rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20">B2C Hard-water Homeowner</button>
          <button onClick={() => applyTpl('b2b_imports')} disabled={pending} className="px-3 py-1.5 text-xs rounded bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20">B2B First-time Importer</button>
        </div>
      </div>

      {/* Basic info */}
      <Section title="Basic" hint="The 1-line elevator pitch. Shown in every plan + creative brief.">
        <Field label="Brand label (shown in cockpit)">
          <input value={brandLabel} onChange={e => setBrandLabel(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
        </Field>
        <Field label="One-liner">
          <input value={oneLiner} onChange={e => setOneLiner(e.target.value)} placeholder="e.g. AI-powered water softener for hard-water India" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
        </Field>
      </Section>

      {/* ICP */}
      <Section title="ICP — who buys" hint='Strategist references this verbatim when picking targeting + pillars. Fields: primary_persona, secondary_personas[], demographics{}, psychographics[], geo{tier1,tier2,exclude}, behaviors[], pain_points[{pain,intensity,phrase_to_use}], jobs_to_be_done[], objections[{objection,rebuttal}], buying_triggers[]'>
        <JsonField label="ICP JSON" value={icpStr} onChange={setIcpStr} rows={20} />
      </Section>

      {/* Voice */}
      <Section title="Voice — how we speak" hint='tone, languages[], vocabulary_dos[], vocabulary_donts[], hooks_that_work[], proof_points[], cta_styles[]'>
        <JsonField label="Voice JSON" value={voiceStr} onChange={setVoiceStr} rows={14} />
      </Section>

      {/* Products */}
      <Section title="Products" hint='Array of { name, sku, price_inr, margin_pct, usp, category }'>
        <JsonField label="Products JSON" value={productsStr} onChange={setProductsStr} rows={12} />
      </Section>

      {/* Customer cohorts */}
      <Section title="Customer cohorts" hint='For lookalike seeding. Array of { cohort, size, avg_ltv_inr, retention_pct, channel }'>
        <JsonField label="Cohorts JSON" value={cohortsStr} onChange={setCohortsStr} rows={10} />
      </Section>

      {/* Past performance */}
      <Section title="Past performance" hint='Strategist replicates winners and avoids losers. Winners: [{angle, cpl_inr, conversions, why_won}] · Losers: [{angle, why_lost}]'>
        <JsonField label="Past winners JSON" value={winnersStr} onChange={setWinnersStr} rows={10} />
        <JsonField label="Past losers JSON" value={losersStr} onChange={setLosersStr} rows={6} />
      </Section>

      {/* Competitors */}
      <Section title="Competitor examples" hint='[{ competitor, ad_library_link, what_they_do_well, what_they_miss }]'>
        <JsonField label="Competitors JSON" value={competitorsStr} onChange={setCompetitorsStr} rows={8} />
      </Section>

      {/* Constraints */}
      <Section title="Constraints" hint='{ banned_topics[], regulatory_required_phrases[], brand_safety[], max_image_text_pct }'>
        <JsonField label="Constraints JSON" value={constraintsStr} onChange={setConstraintsStr} rows={10} />
      </Section>

      {/* Tech IDs */}
      <Section title="Tech IDs per brand" hint="Auditor #89 uses these. Launcher #90 wires Pixel into ads.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta Pixel ID"><input value={metaPixel} onChange={e=>setMetaPixel(e.target.value)} placeholder="123456789012345" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="Meta CAPI Dataset ID"><input value={metaDataset} onChange={e=>setMetaDataset(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="Meta Page ID"><input value={metaPage} onChange={e=>setMetaPage(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="Meta Instagram ID"><input value={metaIg} onChange={e=>setMetaIg(e.target.value)} className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="GA4 Property ID"><input value={ga4Prop} onChange={e=>setGa4Prop(e.target.value)} placeholder="properties/123456" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="GA4 Measurement ID"><input value={ga4Meas} onChange={e=>setGa4Meas(e.target.value)} placeholder="G-XXXX" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="GTM Container ID"><input value={gtm} onChange={e=>setGtm(e.target.value)} placeholder="GTM-XXXX" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
          <Field label="Landing page URL"><input value={landing} onChange={e=>setLanding(e.target.value)} placeholder="https://dcal.in/lp/hardwater" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm"/></Field>
          <Field label="WhatsApp number"><input value={waNum} onChange={e=>setWaNum(e.target.value)} placeholder="+919392389764" className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"/></Field>
        </div>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-bg-soft border-t border-bg-border flex items-center justify-between">
        <div className="text-[11px] text-slate-500">Updates take effect on the NEXT brief submitted.</div>
        <button onClick={saveAll} disabled={pending} className="px-5 py-2 text-sm rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50">
          {pending ? 'Saving…' : '💾 Save brand profile'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: any }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function JsonField({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-[11px] font-mono leading-relaxed focus:outline-none focus:border-accent-500/50" />
    </div>
  );
}
