// S-02 â€” the conversation brain. Renders the tenant's system prompt, replays
// recent conversation + memory, runs the tool loop, sends the reply.
import { SALES_AGENT_TEMPLATE } from '../../promptTemplates';
import { db } from '../../lib/db';
import { chat, type ChatMessage } from '../../lib/llm';
import { orgChannel, type Org } from '../../kernel/tenants';
import { sendText } from '../../kernel/channels/whatsapp';
import { getMemory, logEvent, storeMessage } from '../../kernel/crm';
import { executeTool, TOOL_DEFS, type ToolCtx } from './tools';

const MAX_TOOL_ITERATIONS = 8;
const HISTORY_MESSAGES = 12;

function template(): string { return SALES_AGENT_TEMPLATE; }

/** Replace {{dot.path}} placeholders from a context object; objects render as JSON. */
export function renderPrompt(tpl: string, ctx: Record<string, any>): string {
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (_, dotPath: string) => {
    const value = dotPath.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), ctx);
    if (value === undefined || value === null) return 'n/a';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

interface StoredMsg {
  direction: 'inbound' | 'outbound';
  content_type: string;
  body: string | null;
  transcription: string | null;
  extraction: string | null;
}

function toChatMessage(m: StoredMsg): ChatMessage {
  const text =
    m.content_type === 'voice' ? (m.transcription ? `[voice note] ${m.transcription}` : '[voice note that could not be transcribed]')
    : m.content_type === 'image' ? `[image${m.body ? ` with caption: ${m.body}` : ''}]${m.extraction ? ` content: ${m.extraction}` : ''}`
    : ['pdf', 'document'].includes(m.content_type) ? `[document${m.body ? ` ${m.body}` : ''}]${m.extraction ? ` content: ${m.extraction}` : ''}`
    : m.body ?? '';
  return { role: m.direction === 'inbound' ? 'user' : 'assistant', content: text };
}

export async function respond(org: Org, contactId: string, leadId: string, conversationId: string): Promise<string | null> {
  const [{ data: lead }, { data: contact }, memory, { data: history }] = await Promise.all([
    db.from('sales_leads').select('*').eq('id', leadId).single(),
    db.from('sales_contacts').select('*').eq('id', contactId).single(),
    getMemory(org.id, contactId),
    db.from('sales_messages')
      .select('direction,content_type,body,transcription,extraction')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_MESSAGES),
  ]);
  if (!lead || !contact) throw new Error('lead or contact not found');

  const system = renderPrompt(template(), {
    org,
    lead,
    contact,
    contact_memory: {
      summary: memory.summary || '(new customer â€” no history yet)',
      facts: memory.facts?.length ? memory.facts : '(none yet)',
    },
  });

  const messages: ChatMessage[] = [
    { role: 'system', content: system },
    ...(history ?? []).reverse().map(m => toChatMessage(m as StoredMsg)),
  ];

  const ctx: ToolCtx = { org, contactId, leadId, conversationId };
  let replyText: string | null = null;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const result = await chat({
      orgId: org.id, leadId, action: 'agent_reply', tier: 'premium',
      messages, tools: TOOL_DEFS, maxTokens: 512,
    });

    if (!result.toolCalls.length) {
      replyText = (result.content ?? '').trim() || null;
      break;
    }

    messages.push({ role: 'assistant', content: result.content, tool_calls: result.toolCalls });
    for (const call of result.toolCalls) {
      let args: any = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* model sent bad JSON */ }
      const output = await executeTool(ctx, call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
    }
  }

  if (!replyText) {
    // Loop exhausted without a text reply â€” never leave the customer in silence.
    replyText = 'Give me one moment â€” checking that for you.';
    await logEvent(org.id, leadId, 'agent_loop_exhausted', 'system', {});
  }

  // The prompt allows up to two short messages separated by '---'.
  const parts = replyText.split(/\n---\n/).map(p => p.trim()).filter(Boolean).slice(0, 2);

  const channel = await orgChannel(org.id, 'whatsapp');
  const channelReady = !!(channel?.identifier && !channel.identifier.startsWith('REPLACE'));

  for (const part of parts) {
    let externalId: string | null = null;
    if (channelReady && channel && contact.phone) {
      const sent = await sendText(channel, contact.phone, part);
      externalId = sent.messageId;
    }
    await storeMessage(org.id, conversationId, {
      direction: 'outbound', sender: 'ai', body: part, external_id: externalId,
      ai_meta: { action: 'agent_reply', sent: channelReady },
    });
  }

  return parts.join('\n---\n');
}
