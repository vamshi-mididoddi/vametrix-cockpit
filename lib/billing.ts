// ─────────────────────────────────────────────────────────────────────────────
// Vametrix outcome-based pricing — the "Service-as-Software" meter.
//
// Vametrix is not sold per seat. It is sold on the OUTCOME it produces:
//   1. a platform fee (access to the engine),
//   2. a fee per QUALIFIED LEAD the engine delivers, and
//   3. a SUCCESS FEE — a % of the revenue actually closed.
//
// This aligns Vametrix with the customer (we earn when they earn) and lets us
// price against the agency we replace, not against other software tools.
//
// Rates differ by plan tier. A client's tier lives in tenants.plan, so changing
// a client's plan immediately changes their invoice. Tune the numbers here;
// move to a `billing_plans` table later if rates need to vary per individual client.
// ─────────────────────────────────────────────────────────────────────────────

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface PricingPlan {
  tier: PlanTier;
  label: string;
  blurb: string;
  platformFeeInr: number;        // monthly base access fee
  perQualifiedLeadInr: number;   // charged per qualified lead delivered
  successFeePct: number;         // % of closed revenue (the alignment piece)
}

// Higher tiers: higher base, lower marginal cost — rewards scale.
export const PLANS: Record<PlanTier, PricingPlan> = {
  starter: {
    tier: 'starter', label: 'Starter', blurb: 'Founder running first paid acquisition',
    platformFeeInr: 25000, perQualifiedLeadInr: 200, successFeePct: 5,
  },
  growth: {
    tier: 'growth', label: 'Growth', blurb: 'Scaling Meta + WhatsApp into a real engine',
    platformFeeInr: 50000, perQualifiedLeadInr: 150, successFeePct: 4,
  },
  enterprise: {
    tier: 'enterprise', label: 'Enterprise', blurb: 'Multi-brand operators & agencies',
    platformFeeInr: 100000, perQualifiedLeadInr: 100, successFeePct: 3,
  },
};

export const PLAN_TIERS: PlanTier[] = ['starter', 'growth', 'enterprise'];

// Map whatever is stored in tenants.plan to a known tier (defaults to starter).
export function planFromTenant(plan?: string | null): PricingPlan {
  const key = (plan || '').toLowerCase().trim();
  if (key in PLANS) return PLANS[key as PlanTier];
  // tolerate legacy / pilot values
  if (key === 'master_pilot' || key === 'pilot') return PLANS.enterprise;
  return PLANS.starter;
}

// What a traditional performance-marketing agency would charge for the same work,
// used only to show the customer their savings. Conservative India-market numbers.
export interface AgencyBaseline {
  retainerInr: number;     // monthly retainer
  pctOfAdSpend: number;    // media-management fee as % of ad spend
}

export const AGENCY_BASELINE: AgencyBaseline = {
  retainerInr: 150000,
  pctOfAdSpend: 15,
};

export interface BillingUsage {
  qualifiedLeads: number;
  wonDeals: number;
  revenueInr: number;
  adSpendInr: number;
}

export interface InvoiceLine {
  label: string;
  detail: string;
  amountInr: number;
}

export interface Invoice {
  lines: InvoiceLine[];
  totalInr: number;
  agencyCostInr: number;
  savingsInr: number;
  effectiveTakeRatePct: number | null; // Vametrix cost as % of revenue produced
}

export function computeInvoice(usage: BillingUsage, plan: PricingPlan, agency: AgencyBaseline = AGENCY_BASELINE): Invoice {
  const leadFee = usage.qualifiedLeads * plan.perQualifiedLeadInr;
  const successFee = Math.round((usage.revenueInr * plan.successFeePct) / 100);

  const lines: InvoiceLine[] = [
    { label: `Platform fee · ${plan.label}`, detail: 'Engine access — agents, cockpit, attribution', amountInr: plan.platformFeeInr },
    { label: 'Qualified leads', detail: `${usage.qualifiedLeads.toLocaleString('en-IN')} × ₹${plan.perQualifiedLeadInr}`, amountInr: leadFee },
    { label: 'Success fee', detail: `${plan.successFeePct}% of ₹${Math.round(usage.revenueInr).toLocaleString('en-IN')} closed revenue`, amountInr: successFee },
  ];
  const totalInr = lines.reduce((a, l) => a + l.amountInr, 0);

  const agencyCostInr = agency.retainerInr + Math.round((usage.adSpendInr * agency.pctOfAdSpend) / 100);
  const savingsInr = agencyCostInr - totalInr;
  const effectiveTakeRatePct = usage.revenueInr > 0 ? (totalInr / usage.revenueInr) * 100 : null;

  return { lines, totalInr, agencyCostInr, savingsInr, effectiveTakeRatePct };
}
