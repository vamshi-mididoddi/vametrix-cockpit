// Canonical agent + infrastructure registry.
// Sidebar nav is data-driven from this.

export type AgentStatus = 'live' | 'parked' | 'planned' | 'partial';

export const STATUS_META: Record<AgentStatus, { label: string; dot: string; color: string; bg: string; border: string }> = {
  live:    { label: 'LIVE',    dot: 'bg-accent-500', color: 'text-accent-400', bg: 'bg-accent-500/10', border: 'border-accent-500/30' },
  parked:  { label: 'PARKED',  dot: 'bg-amber-500',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  planned: { label: 'PLANNED', dot: 'bg-slate-600',  color: 'text-slate-500',  bg: 'bg-slate-700/30',  border: 'border-slate-700' },
  partial: { label: 'PARTIAL', dot: 'bg-sky-500',    color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30' },
};

export interface Agent {
  id: string; num: number; name: string; fleet: 'Sales & Marketing' | 'Operations' | 'Intelligence';
  status: AgentStatus; desc: string; icon: string;
  planCopy?: { whatItDoes: string; inputs: string[]; outputs: string[]; eta: string };
}

export const AGENTS: Agent[] = [
  // ── Sales & Marketing fleet (1-8 + 14-15) — primary engine ──
  { id: 'agent-1',  num: 1,  name: 'WhatsApp Qualifier',     fleet: 'Sales & Marketing', status: 'live',    desc: 'First-contact AI on WhatsApp — qualifies leads in 3-5 turns (Telugu/English/Hindi auto-detect), scores 0-100, auto-routes via Agent #14.', icon: 'message-circle' },
  { id: 'agent-2',  num: 2,  name: 'Voice Receptionist',     fleet: 'Sales & Marketing', status: 'parked',  desc: 'Inbound + outbound voice agent. Parked on India +91 number procurement.', icon: 'phone' },
  { id: 'agent-3',  num: 3,  name: 'Outbound B2B',           fleet: 'Sales & Marketing', status: 'live',    desc: 'Cold WhatsApp outreach — upload contacts, send Meta-approved templates in rate-limited batches; replies flow into the qualifier → router → pipeline.', icon: 'send' },
  { id: 'agent-4',  num: 4,  name: 'Product Scout',          fleet: 'Sales & Marketing', status: 'planned', desc: 'Finds trending importable products via Alibaba, Amazon, market signals. Feeds Market Validator.', icon: 'search', planCopy: { whatItDoes: 'Continuous scan to surface importable products with margin opportunity.', inputs: ['Category seeds', 'Margin thresholds'], outputs: ['Ranked candidates', 'Demand signals', 'Competitor map'], eta: 'Month 4-5' } },
  { id: 'agent-5',  num: 5,  name: 'Market Validator',       fleet: 'Sales & Marketing', status: 'planned', desc: 'Validates demand + ICP for a product before commit. Buyer-segment sizing, competition map.', icon: 'flask-conical', planCopy: { whatItDoes: 'Validates a product idea before commit.', inputs: ['Product from #4', 'Market geos'], outputs: ['Go/no-go score', 'ICP segments', 'Pricing band'], eta: 'Month 4-5' } },
  { id: 'agent-6',  num: 6,  name: 'Buyer Hunter',           fleet: 'Sales & Marketing', status: 'live',    desc: 'Auto-discovers real ICP businesses per vertical+city (OpenStreetMap; Google Places when keyed), extracts phones, stages them → one click into an Outbound campaign.', icon: 'target' },
  { id: 'agent-7',  num: 7,  name: 'Creative Factory',       fleet: 'Sales & Marketing', status: 'live',    desc: 'Generates ad images (Nano Banana) + copy variants + video briefs. Uploads to Storage CDN.', icon: 'sparkles' },
  { id: 'agent-8',  num: 8,  name: 'Performance Marketer',   fleet: 'Sales & Marketing', status: 'live',    desc: 'Strategist + tech auditor + launcher + daily audit + CAPI quality + auto-execute. End-to-end ROAS brain.', icon: 'bar-chart-3' },
  { id: 'agent-14', num: 14, name: 'Lead Router & CRM',      fleet: 'Sales & Marketing', status: 'live',    desc: 'Auto-assigns qualified WA leads to next sales rep (load-balanced). Activity timeline. CAPI Purchase loop on Won.', icon: 'brain' },
  { id: 'agent-15', num: 15, name: 'Analytics Reporter',     fleet: 'Sales & Marketing', status: 'live',    desc: 'Daily 7 AM founder brief: lead volume, response time, qualified rate, ad spend, KPI trends.', icon: 'file-text' },

  // ── Operations fleet (10-13) — post-sale ──
  { id: 'agent-10', num: 10, name: 'Order Processor',        fleet: 'Operations',        status: 'planned', desc: 'Confirmed-order → PO/invoice → payment tracking → handoff to logistics.', icon: 'receipt', planCopy: { whatItDoes: 'Order confirmed → PO/invoice → payment tracking → handoff.', inputs: ['Hot lead with order', 'Pricing', 'KYC'], outputs: ['Invoice', 'Payment status', 'Trigger logistics'], eta: 'Month 2-3' } },
  { id: 'agent-11', num: 11, name: 'Logistics Tracker',      fleet: 'Operations',        status: 'planned', desc: 'Tracks import + last-mile shipments. Proactively notifies customers on ETA changes.', icon: 'truck', planCopy: { whatItDoes: 'Tracks shipments. Notifies customer on ETA changes.', inputs: ['Shipment from #10 or manual'], outputs: ['Status updates', 'WA notifications'], eta: 'Month 2-3' } },
  { id: 'agent-12', num: 12, name: 'Customer Support',       fleet: 'Operations',        status: 'planned', desc: 'Post-sale: complaints, warranty claims, returns, with SLA tracking.', icon: 'life-buoy', planCopy: { whatItDoes: 'Post-sale customer ticket flow.', inputs: ['Inbound on existing-customer phone'], outputs: ['Resolution path', 'CSAT signals'], eta: 'Month 2-3' } },
  { id: 'agent-13', num: 13, name: 'Finance',                fleet: 'Operations',        status: 'planned', desc: 'Bookkeeping + GST draft (CA still files). Cashflow view, vendor payment timing.', icon: 'wallet', planCopy: { whatItDoes: 'Drafts bookkeeping + monthly GST workings.', inputs: ['Bank feed', 'Invoices', 'Receipts'], outputs: ['GL drafts', 'GST workings', 'Cashflow'], eta: 'Month 4-5' } },

  // ── Intelligence fleet (9, 16) — strategic ──
  { id: 'agent-9',  num: 9,  name: 'Supplier Negotiator',    fleet: 'Intelligence',      status: 'planned', desc: 'Buyer-side negotiation with overseas suppliers. RFQ → bids → counter → contract draft.', icon: 'handshake', planCopy: { whatItDoes: 'Buyer-side negotiation. RFQ → bid → counter → contract.', inputs: ['Product spec', 'Quantity', 'Target price'], outputs: ['Supplier shortlist', 'Risk score', 'Draft contract'], eta: 'Month 4-5' } },
  { id: 'agent-16', num: 16, name: 'Strategic Advisor',      fleet: 'Intelligence',      status: 'planned', desc: 'Founder-level synthesis across all engine data. Weekly hypothesis + recommended priorities.', icon: 'compass', planCopy: { whatItDoes: 'Founder-level synthesis across all engine data.', inputs: ['All engine metrics', 'Strategic goals'], outputs: ['Weekly brief', 'Prioritized actions'], eta: 'Month 4-5' } },
];

export const INFRA = [
  { id: 'ceo',       label: 'VAMETRIX CEO',    icon: 'shield',   status: 'live' as AgentStatus },
  { id: 'leads',     label: 'Lead Pipeline',   icon: 'kanban-square', status: 'live' as AgentStatus },
  { id: 'inbox',     label: 'WhatsApp Inbox',  icon: 'message-square', status: 'live' as AgentStatus },
  { id: 'broadcast', label: 'Broadcast',       icon: 'megaphone', status: 'live' as AgentStatus },
  { id: 'reminders', label: 'Smart Reminders', icon: 'bell-ring', status: 'live' as AgentStatus },
  { id: 'templates', label: 'WA Templates',    icon: 'file-text', status: 'live' as AgentStatus },
  { id: 'marketing', label: 'Marketing Brain', icon: 'rocket',   status: 'live' as AgentStatus },
  { id: 'brands',    label: 'Brand Context',   icon: 'tag',      status: 'live' as AgentStatus },
  { id: 'tech-audit',label: 'Tech Stack Audit',icon: 'shield-check', status: 'live' as AgentStatus },
  { id: 'opt-outs',  label: 'Opt-outs',        icon: 'ban',      status: 'live' as AgentStatus },
  { id: 'knowledge', label: 'Knowledge Base',  icon: 'book',     status: 'live' as AgentStatus },
  { id: 'workflows', label: 'Workflows (n8n)', icon: 'workflow', status: 'live' as AgentStatus },
  { id: 'cost',      label: 'Cost Monitor',    icon: 'wallet',   status: 'live' as AgentStatus },
  { id: 'team',      label: 'Team & Roles',    icon: 'users',    status: 'live' as AgentStatus },
  { id: 'audit',     label: 'Audit Log',       icon: 'clipboard-list', status: 'planned' as AgentStatus },
  { id: 'settings',  label: 'Settings',        icon: 'settings', status: 'live' as AgentStatus },
];

export const BRAND_LABEL: Record<string, string> = {
  befach_imports: 'Befach Imports',
  gcom: 'GCOM',
  dcal: 'Dcal',
  dcal_hardwater: "D'Cal Hardwater",
  befach_diet: 'Befach Diet',
  wellness: 'Wellness',
  essentio: 'Essentio',
  shared: 'Shared',
  unknown: 'Unknown',
};

export const STAGE_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:        { label: 'NEW',       color: 'text-slate-300', bg: 'bg-slate-700/30', dot: 'bg-slate-400' },
  engaged:    { label: 'ENGAGED',   color: 'text-sky-300',   bg: 'bg-sky-500/10',   dot: 'bg-sky-400' },
  qualified:  { label: 'QUALIFIED', color: 'text-violet-300',bg: 'bg-violet-500/10',dot: 'bg-violet-400' },
  hot:        { label: 'HOT',       color: 'text-accent-300',bg: 'bg-accent-500/10',dot: 'bg-accent-500' },
  escalate:   { label: 'ESCALATE',  color: 'text-amber-300', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  lost:       { label: 'LOST',      color: 'text-rose-300',  bg: 'bg-rose-500/10',  dot: 'bg-rose-500' },
};
