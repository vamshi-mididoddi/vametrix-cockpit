// Sales module tool registry â€” what the agent brain can DO. Definitions follow
// prompts/agent-tools.json; executors run against Supabase with the org always
// scoped. min_price is never returned to the model: floors are enforced by the
// SQL trigger on sales_quotes, and violations come back as tool errors the
// agent can react to (re-price or escalate). Every executor returns a plain
// object that is JSON-serialized back to the model.
import { db, must } from '../../lib/db';
import type { ToolDef } from '../../lib/llm';
import type { Org } from '../../kernel/tenants';
import {
  advanceLead, appendFact, logEvent, scheduleFollowup,
} from '../../kernel/crm';
import { notifyOperator } from '../../kernel/notify';
import { searchKb } from './kb';

export interface ToolCtx {
  org: Org;
  contactId: string;
  leadId: string;
  conversationId: string;
}

export const TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'kb_search',
      description: 'Search the company knowledge base for facts: product details, policies, shipping, certifications, FAQs. Use before answering ANY factual question about the company or its products.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'What you need to know, phrased as the underlying question.' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_products',
      description: 'Look up the product catalog: names, specs, units, list prices, MOQs. Use for recommendations and before quoting anything.',
      parameters: {
        type: 'object',
        properties: { search: { type: 'string', description: 'Product name/keyword, or omit for full catalog summary.' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_quote',
      description: 'Generate a formal quotation and record it. Only after the customer confirmed products and quantities. Prices must respect your discount authority. product_id MUST be the exact `id` value from a list_products call made in THIS turn â€” never guess or reuse remembered ids; call list_products first.',
      parameters: {
        type: 'object',
        properties: {
          line_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                qty: { type: 'number' },
                unit_price: { type: 'number' },
              },
              required: ['product_id', 'qty', 'unit_price'],
            },
          },
          payment_terms: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['line_items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_meeting',
      description: "Book a call/demo/site visit inside the company's working hours. Confirm the slot with the customer before calling this.",
      parameters: {
        type: 'object',
        properties: {
          when_iso: { type: 'string', description: 'Agreed start time, ISO 8601 with timezone offset.' },
          meeting_type: { type: 'string', enum: ['call', 'demo', 'site_visit', 'video'] },
          notes: { type: 'string' },
        },
        required: ['when_iso', 'meeting_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead',
      description: 'Record qualification answers, status changes, or value estimate the moment they are earned.',
      parameters: {
        type: 'object',
        properties: {
          qualification: { type: 'object', description: 'Answers keyed by question id from your qualification list.' },
          status: { type: 'string', enum: ['engaged', 'qualifying', 'qualified', 'quoted', 'negotiating', 'won', 'lost', 'disqualified'] },
          value_estimate: { type: 'number' },
          lost_reason: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_contact_fact',
      description: 'Persist a durable fact about this customer to long-term memory (role, company details, preferences, constraints).',
      parameters: {
        type: 'object',
        properties: { fact: { type: 'string' } },
        required: ['fact'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_followup',
      description: 'Plan your next touch if the customer goes quiet. Give the moment and the angle (what the follow-up should reference or offer).',
      parameters: {
        type: 'object',
        properties: {
          due_in_hours: { type: 'number' },
          reason: { type: 'string', enum: ['no_reply', 'quote_pending', 'meeting_reminder', 're_engage_dormant', 'post_sale_checkin'] },
          angle: { type: 'string' },
        },
        required: ['due_in_hours', 'reason', 'angle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Hand this conversation to a human colleague. Use ONLY for configured escalation triggers, explicit customer requests, or genuine uncertainty after retrying.',
      parameters: {
        type: 'object',
        properties: {
          trigger: { type: 'string', enum: ['rule_boundary', 'explicit_request', 'high_value', 'sentiment', 'ai_uncertain', 'complaint', 'legal_or_compliance'] },
          summary: { type: 'string', description: '30-second brief: who, what they want, sticking point, your recommended move.' },
        },
        required: ['trigger', 'summary'],
      },
    },
  },
];

export async function executeTool(ctx: ToolCtx, name: string, args: any): Promise<object> {
  try {
    switch (name) {
      case 'kb_search': {
        const results = await searchKb(ctx.org.id, String(args.query ?? ''));
        return results.length
          ? { results: results.map(r => r.content) }
          : { results: [], note: 'Nothing found in the knowledge base for this query. Do not invent an answer.' };
      }

      case 'list_products': {
        let q = db.from('sales_products')
          .select('id,sku,name,description,specs,unit,currency,list_price,moq')
          .eq('org_id', ctx.org.id).eq('active', true).limit(20);
        if (args.search) q = q.or(`name.ilike.%${args.search}%,sku.ilike.%${args.search}%,description.ilike.%${args.search}%`);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        return { products: data ?? [] };
      }

      case 'create_quote':
        return await createQuote(ctx, args);

      case 'schedule_meeting': {
        const when = new Date(String(args.when_iso));
        if (isNaN(when.getTime())) return { error: 'when_iso is not a valid ISO datetime' };
        if (when.getTime() < Date.now()) return { error: 'meeting time is in the past' };
        must(await db.from('sales_meetings').insert({
          org_id: ctx.org.id, lead_id: ctx.leadId, scheduled_at: when.toISOString(),
          meeting_type: args.meeting_type, notes: args.notes ?? null,
        }).select('id').single(), 'insert meeting');
        await advanceLead(ctx.leadId, 'meeting_scheduled', 'ai', { when: when.toISOString() });
        const hoursUntil = (when.getTime() - Date.now()) / 3600_000;
        if (hoursUntil > 25) await scheduleFollowup(ctx.org.id, ctx.leadId, hoursUntil - 24, 'meeting_reminder', { when: when.toISOString() });
        return { booked: true, when: when.toISOString(), note: 'Meeting recorded. Reminders are automatic.' };
      }

      case 'update_lead':
        return await updateLead(ctx, args);

      case 'save_contact_fact': {
        await appendFact(ctx.org.id, ctx.contactId, String(args.fact ?? ''));
        return { saved: true };
      }

      case 'schedule_followup': {
        await scheduleFollowup(ctx.org.id, ctx.leadId, Number(args.due_in_hours ?? 24), String(args.reason ?? 'no_reply'), { angle: args.angle ?? '' });
        return { scheduled: true };
      }

      case 'escalate_to_human': {
        must(await db.from('sales_escalations').insert({
          org_id: ctx.org.id, lead_id: ctx.leadId, conversation_id: ctx.conversationId,
          trigger: args.trigger, summary: args.summary,
        }).select('id').single(), 'insert escalation');
        await db.from('sales_conversations').update({ status: 'handed_off' }).eq('id', ctx.conversationId);
        await logEvent(ctx.org.id, ctx.leadId, 'escalated', 'ai', { trigger: args.trigger });
        await notifyOperator(`ðŸ”º <b>${ctx.org.name}</b> escalation (${args.trigger})\n${args.summary}`);
        return { escalated: true, note: 'A human colleague has been notified. Reassure the customer they will hear back within the hour, then stop selling.' };
      }

      default:
        return { error: `unknown tool: ${name}` };
    }
  } catch (e) {
    // Tool failures (including SQL floor violations) go back to the model verbatim
    // so it can re-price, rephrase, or escalate â€” never crash the conversation.
    return { error: (e as Error).message };
  }
}

async function createQuote(ctx: ToolCtx, args: any): Promise<object> {
  const items: Array<{ product_id: string; qty: number; unit_price: number }> = args.line_items ?? [];
  if (!items.length) return { error: 'line_items is empty' };

  const ids = items.map(i => i.product_id);
  const { data: products, error } = await db.from('sales_products')
    .select('id,sku,name,list_price,moq,currency')
    .eq('org_id', ctx.org.id).in('id', ids);
  if (error) return { error: error.message };
  const byId = new Map((products ?? []).map(p => [p.id, p]));

  const lineItems = [];
  let subtotal = 0;
  for (const item of items) {
    const p = byId.get(item.product_id);
    if (!p) return { error: `unknown product_id ${item.product_id} â€” call list_products right now, then retry create_quote using the exact 'id' field from its results` };
    if (item.qty < Number(p.moq)) return { error: `qty ${item.qty} below MOQ ${p.moq} for ${p.sku}` };
    const lineTotal = item.qty * item.unit_price;
    subtotal += lineTotal;
    lineItems.push({
      product_id: p.id, sku: p.sku, name: p.name,
      qty: item.qty, unit_price: item.unit_price, line_total: lineTotal,
    });
  }

  // Approval boundary: above threshold the quote needs a human before it exists.
  const threshold = Number(ctx.org.config?.negotiation?.approval_required_above_value ?? Infinity);
  if (subtotal > threshold) {
    return await executeTool(ctx, 'escalate_to_human', {
      trigger: 'high_value',
      summary: `Quote request of ${subtotal} exceeds approval threshold ${threshold}. Items: ${lineItems.map(l => `${l.qty}x ${l.sku} @ ${l.unit_price}`).join(', ')}. Needs approval before sending.`,
    });
  }

  const validDays = Number(ctx.org.config?.quote_valid_days ?? 15);
  const quoteNumber = `Q-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data: quote, error: qErr } = await db.from('sales_quotes').insert({
    org_id: ctx.org.id, lead_id: ctx.leadId, quote_number: quoteNumber,
    line_items: lineItems, subtotal, discount_pct: 0, total: subtotal,
    currency: lineItems[0] ? byId.get(lineItems[0].product_id)?.currency ?? 'INR' : 'INR',
    status: 'sent',
    valid_until: new Date(Date.now() + validDays * 86400_000).toISOString().slice(0, 10),
    created_by: 'ai',
  }).select('id,quote_number,total,valid_until').single();
  if (qErr) return { error: `quote rejected: ${qErr.message}` }; // includes SQL floor violations

  await advanceLead(ctx.leadId, 'quoted', 'ai', { quote_number: quoteNumber, total: subtotal });
  await scheduleFollowup(ctx.org.id, ctx.leadId, 24, 'quote_pending', { quote_number: quoteNumber });
  return {
    quote_number: quote.quote_number, total: quote.total, valid_until: quote.valid_until,
    note: 'Quote recorded. Present the numbers to the customer in the chat message yourself.',
  };
}

async function updateLead(ctx: ToolCtx, args: any): Promise<object> {
  const { data: lead, error } = await db.from('sales_leads')
    .select('qualification,score,status').eq('id', ctx.leadId).single();
  if (error) return { error: error.message };

  const patch: Record<string, any> = {};
  let score = lead.score as number;

  if (args.qualification && typeof args.qualification === 'object') {
    const merged = { ...(lead.qualification ?? {}), ...args.qualification };
    patch.qualification = merged;
    const questions: Array<{ id: string; weight: number }> = ctx.org.config?.qualification?.questions ?? [];
    score = Math.min(100, questions.reduce((sum, q) => {
      const answer = merged[q.id];
      return sum + (answer !== undefined && answer !== null && String(answer).trim() !== '' ? Number(q.weight) : 0);
    }, 0));
    patch.score = score;
  }
  if (args.value_estimate !== undefined) patch.value_estimate = args.value_estimate;
  if (args.lost_reason) patch.lost_reason = args.lost_reason;

  if (Object.keys(patch).length) {
    const { error: uErr } = await db.from('sales_leads').update(patch).eq('id', ctx.leadId);
    if (uErr) return { error: uErr.message };
  }

  if (args.status) {
    const threshold = Number(ctx.org.config?.qualification?.qualified_threshold ?? 60);
    if (args.status === 'qualified' && score < threshold) {
      const questions: Array<{ id: string; ask: string }> = ctx.org.config?.qualification?.questions ?? [];
      const answered = Object.keys({ ...(lead.qualification ?? {}), ...(args.qualification ?? {}) });
      const missing = questions.filter(q => !answered.includes(q.id)).map(q => q.ask);
      return { accepted: false, score, threshold, still_missing: missing, note: 'Keep qualifying naturally before marking qualified.' };
    }
    await advanceLead(ctx.leadId, args.status, 'ai', args.lost_reason ? { lost_reason: args.lost_reason } : {});
  }

  return { accepted: true, score };
}
