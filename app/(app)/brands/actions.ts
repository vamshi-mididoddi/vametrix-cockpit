'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

type R = { ok: boolean; error?: string; [k: string]: any };

export async function updateBrandProfile(brand_key: string, patch: Record<string, any>): Promise<R> {
  const u = await requireAdmin();
  if (!brand_key) return { ok: false, error: 'brand_key required' };
  try {
    const supa = supabaseAdmin();
    // Whitelist allowed fields to prevent arbitrary column writes
    const allowed: any = {};
    for (const k of [
      'brand_label', 'one_liner', 'icp', 'voice', 'products', 'customer_cohorts',
      'past_winners', 'past_losers', 'competitor_examples', 'reference_creatives',
      'constraints', 'meta_pixel_id', 'meta_dataset_id', 'ga4_property_id',
      'ga4_measurement_id', 'gtm_container_id', 'landing_page_url',
      'whatsapp_number', 'meta_page_id', 'meta_instagram_id', 'active',
    ]) {
      if (k in patch) allowed[k] = patch[k];
    }
    allowed.updated_at = new Date().toISOString();
    allowed.updated_by = u.id;

    const { error } = await supa.from('brand_profiles').update(allowed).eq('brand_key', brand_key);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/brands');
    revalidatePath(`/brands/${brand_key}`);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Quick-fill template (creates a starter ICP for the most common shapes)
export async function applyTemplate(brand_key: string, template: 'b2b_softener' | 'b2c_dtc' | 'b2b_imports'): Promise<R> {
  const u = await requireAdmin();
  const templates: Record<string, any> = {
    b2b_softener: {
      icp: {
        primary_persona: 'Water softener installer / plumber / builder consultant',
        secondary_personas: ['apartment association', 'commercial property manager'],
        demographics: { age_min: 28, age_max: 55, gender: 'all', income_band: '5-20 LPA', languages: ['en','te','hi'] },
        psychographics: ['margin-conscious','referral-driven','technical-credibility-matters'],
        geo: { tier1: ['Hyderabad','Bangalore','Chennai'], tier2: ['Warangal','Vijayawada','Coimbatore'], exclude: [] },
        behaviors: ['IndiaMART searches','plumber WhatsApp groups','builder forums'],
        pain_points: [
          { pain: 'thin margins on installs', intensity: 'high', phrase_to_use: 'Better margin than aquaguard' },
          { pain: 'customer complaints from limescale', intensity: 'medium' }
        ],
        jobs_to_be_done: ['win bigger projects','differentiate from cheap competitors','add recurring service revenue'],
        objections: [
          { objection: 'will my customers pay this much', rebuttal: 'we ship co-branded sample + ROI calculator' },
          { objection: 'no installer training', rebuttal: '2-hour video + on-call support for first 5 installs' }
        ],
        buying_triggers: ['new builder project','dissatisfied customer call','distributor pitch'],
      },
      voice: { tone: 'expert, peer-to-peer, B2B-direct', languages: ['en','te'], vocabulary_dos: ['margin','distributor','ROI','warranty'], vocabulary_donts: ['cheap','retail','consumer'], cta_styles: ['Become DCal partner','Get distributor pricing','WhatsApp catalog'] },
    },
    b2c_dtc: {
      icp: {
        primary_persona: 'Urban Indian homeowner / homebuyer in hard-water area',
        secondary_personas: ['apartment owner','newly-married couple','parent with school-age kids'],
        demographics: { age_min: 28, age_max: 50, gender: 'all', income_band: '10-30 LPA', languages: ['te','en','hi'] },
        psychographics: ['protective of investments','researches reviews','susceptible to social proof','responds to before/after visuals'],
        geo: { tier1: ['Hyderabad','Chennai','Bangalore'], tier2: ['Warangal','Coimbatore','Mysuru'], exclude: [] },
        behaviors: ['Google "hard water solution"','reads aquaguard reviews','asks neighbors'],
        pain_points: [
          { pain: 'white marks on taps + tiles', intensity: 'high', phrase_to_use: 'White marks on your taps?' },
          { pain: 'geyser failing in 18 months', intensity: 'high', phrase_to_use: 'Geyser pak chuka kya?' },
          { pain: 'hair fall + dry skin', intensity: 'medium' }
        ],
        jobs_to_be_done: ['protect ₹50k geyser','stop hair fall','save monthly maintenance'],
        objections: [
          { objection: 'too expensive upfront', rebuttal: '12-month payback shown in ROI calc' },
          { objection: 'will it actually work in my area', rebuttal: 'free water TDS test' }
        ],
        buying_triggers: ['new home','geyser failed','landlord asked'],
      },
      voice: { tone: 'warm, problem-aware, neighborly', languages: ['te','en','hi'], vocabulary_dos: ['hard water','TDS','limescale','geyser','free demo'], vocabulary_donts: ['cheap','luxury','world-class'], cta_styles: ['Get free demo','WhatsApp Test free','Talk to expert'] },
    },
    b2b_imports: {
      icp: {
        primary_persona: 'First-time / small-scale importer (founder of 2-20 person business)',
        secondary_personas: ['existing importer wanting HS-code/customs help','trader looking to expand'],
        demographics: { age_min: 30, age_max: 55, gender: 'all', income_band: '15-100 LPA business', languages: ['en','hi'] },
        psychographics: ['paranoid about customs holdups','time-pressured','wants single-window service'],
        geo: { tier1: ['Mumbai','Delhi NCR','Chennai','Hyderabad'], tier2: [], exclude: [] },
        behaviors: ['IndiaMART supplier search','LinkedIn import groups','Google "HS code [product]"'],
        pain_points: [
          { pain: 'cargo stuck in customs', intensity: 'high', phrase_to_use: 'Customs cleared in 48 hours, guaranteed.' },
          { pain: "don't know HS codes / duty rates", intensity: 'high' }
        ],
        objections: [{ objection: 'how do I trust a service', rebuttal: 'pay only on customs clearance' }],
        buying_triggers: ['first shipment','shipment stuck','quote needed'],
      },
      voice: { tone: 'authoritative, trade-savvy', languages: ['en','hi'], vocabulary_dos: ['HS code','customs clearance','duty optimization','single-window'], vocabulary_donts: ['cheap','easy','simple'], cta_styles: ['Get duty quote','WhatsApp HS code'] },
    },
  };

  const tpl = templates[template];
  if (!tpl) return { ok: false, error: 'unknown template' };
  return updateBrandProfile(brand_key, tpl);
}
