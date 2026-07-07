// ModelRouter â€” the only file that talks to OpenRouter. Per ARCHITECTURE.md
// Decision #8: modules never couple to a model id; they ask for a tier and this
// router resolves it, captures cost, and logs to sales_ai_actions.
import { db } from './db';
import { env, envOr } from './env';

const BASE = envOr('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');

const TIER_MODELS: Record<string, string> = {
  fast: envOr('OPENROUTER_FAST_MODEL', 'google/gemini-2.5-flash'),
  default: envOr('OPENROUTER_DEFAULT_MODEL', 'anthropic/claude-sonnet-5'),
  premium: envOr('OPENROUTER_PREMIUM_MODEL', 'anthropic/claude-sonnet-5'),
};

export type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string | null; tool_calls: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDef {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

export interface ChatResult {
  content: string | null;
  toolCalls: ToolCall[];
  model: string;
  tokensIn: number;
  tokensOut: number;
}

async function orFetch(pathname: string, body: object): Promise<any> {
  const res = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': envOr('OPENROUTER_HTTP_REFERER', 'https://vametrix.ai'),
      'X-Title': envOr('OPENROUTER_APP_NAME', 'VAMETRIX Engine'),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${pathname} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function chat(opts: {
  orgId: string;
  leadId?: string;
  action: string; // logged label, e.g. 'agent_reply', 'opener', 'followup_compose'
  tier?: keyof typeof TIER_MODELS;
  messages: ChatMessage[];
  tools?: ToolDef[];
  maxTokens?: number;
}): Promise<ChatResult> {
  const model = TIER_MODELS[opts.tier ?? 'default'] ?? TIER_MODELS.default!;
  const t0 = Date.now();
  // Providers occasionally return broken partials (no usage, truncated text,
  // finish_reason 'error'/'length'/null). Retry those up to twice â€” a garbled
  // half-message must never reach a customer.
  let resp: any;
  let choice: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    resp = await orFetch('/chat/completions', {
      model,
      messages: opts.messages,
      ...(opts.tools?.length ? { tools: opts.tools } : {}),
      max_tokens: opts.maxTokens ?? 1024,
    });
    choice = resp.choices?.[0];
    const finish = choice?.finish_reason;
    const healthy = choice && (finish === 'stop' || finish === 'tool_calls') && resp.usage?.completion_tokens > 0;
    if (healthy) break;
    console.warn(`[llm] unhealthy response (finish=${finish}, usage=${JSON.stringify(resp.usage)}), attempt ${attempt}/3`);
  }
  const result: ChatResult = {
    content: choice?.message?.content ?? null,
    toolCalls: choice?.message?.tool_calls ?? [],
    model,
    tokensIn: resp.usage?.prompt_tokens ?? 0,
    tokensOut: resp.usage?.completion_tokens ?? 0,
  };
  await db.from('sales_ai_actions').insert({
    org_id: opts.orgId,
    lead_id: opts.leadId ?? null,
    action: opts.action,
    input: { tier: opts.tier ?? 'default', messages: opts.messages.length },
    output: { content: result.content?.slice(0, 500) ?? null, tool_calls: result.toolCalls.map(t => t.function.name) },
    model,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    latency_ms: Date.now() - t0,
  });
  return result;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const resp = await orFetch('/embeddings', {
    model: envOr('OPENROUTER_EMBEDDING_MODEL', 'openai/text-embedding-3-small'),
    input: texts,
  });
  if (!Array.isArray(resp.data)) throw new Error('embeddings: unexpected response shape');
  return resp.data.map((d: { embedding: number[] }) => d.embedding);
}
