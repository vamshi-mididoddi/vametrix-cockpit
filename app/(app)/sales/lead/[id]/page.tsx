// VAMETRIX Sales — Lead detail: the CRM screen. Full conversation, timeline,
// qualification, quotes, and human actions (status, takeover, reply, notes).
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { salesDb } from '@/lib/salesos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Server actions ─────────────────────────────────────────────
async function changeStatus(formData: FormData) {
  'use server';
  const db = salesDb();
  const leadId = String(formData.get('lead_id'));
  const status = String(formData.get('status'));
  await db.rpc('sales_advance_lead', { p_lead_id: leadId, p_new_status: status, p_actor: 'human', p_reason: { via: 'portal' } });
  revalidatePath(`/sales/lead/${leadId}`);
}

async function addNote(formData: FormData) {
  'use server';
  const db = salesDb();
  const leadId = String(formData.get('lead_id'));
  const note = String(formData.get('note') ?? '').trim();
  if (!note) return;
  const { data: lead } = await db.from('sales_leads').select('org_id').eq('id', leadId).single();
  if (lead) {
    await db.from('sales_lead_events').insert({
      org_id: lead.org_id, lead_id: leadId, event_type: 'note', actor: 'human', payload: { note },
    });
  }
  revalidatePath(`/sales/lead/${leadId}`);
}

async function toggleHandoff(formData: FormData) {
  'use server';
  const db = salesDb();
  const conversationId = String(formData.get('conversation_id'));
  const leadId = String(formData.get('lead_id'));
  const to = String(formData.get('to')); // 'human' | 'ai'
  await db.from('sales_conversations')
    .update({ status: to === 'human' ? 'handed_off' : 'open' })
    .eq('id', conversationId);
  if (to === 'ai') {
    await db.from('sales_escalations')
      .update({ status: 'returned_to_ai', resolved_at: new Date().toISOString() })
      .eq('conversation_id', conversationId).eq('status', 'open');
  }
  revalidatePath(`/sales/lead/${leadId}`);
}

async function sendHumanReply(formData: FormData) {
  'use server';
  const db = salesDb();
  const leadId = String(formData.get('lead_id'));
  const conversationId = String(formData.get('conversation_id'));
  const text = String(formData.get('text') ?? '').trim();
  if (!text) return;
  const { data: lead } = await db.from('sales_leads')
    .select('org_id,contact_id,sales_contacts(phone)').eq('id', leadId).single();
  if (!lead) return;
  const phone = (lead.sales_contacts as any)?.phone;
  const { data: channel } = await db.from('sales_channels')
    .select('*').eq('org_id', lead.org_id).eq('type', 'whatsapp').eq('active', true).limit(1).maybeSingle();
  if (!channel || !phone) return;
  const { sendText } = await import('@/lib/engine/kernel/channels/whatsapp');
  const sent = await sendText(channel as any, phone, text);
  await db.from('sales_messages').insert({
    org_id: lead.org_id, conversation_id: conversationId, direction: 'outbound',
    sender: 'human', content_type: 'text', body: text, external_id: sent.messageId,
  });
  await db.from('sales_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  revalidatePath(`/sales/lead/${leadId}`);
}

// ── Page ───────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  new: 'bg-sky-500', engaged: 'bg-blue-500', qualifying: 'bg-indigo-500',
  qualified: 'bg-violet-500', quoted: 'bg-fuchsia-500', negotiating: 'bg-pink-500',
  meeting_scheduled: 'bg-amber-500', won: 'bg-emerald-500', lost: 'bg-zinc-600',
  dormant: 'bg-zinc-500', disqualified: 'bg-zinc-700',
};
const inputCls = 'w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const db = salesDb();
  const { data: lead } = await db.from('sales_leads')
    .select('*,sales_contacts(id,full_name,phone,email,company,city,language)')
    .eq('id', params.id).single();
  if (!lead) notFound();
  const contact: any = lead.sales_contacts;

  const { data: conversation } = await db.from('sales_conversations')
    .select('id,status').eq('contact_id', contact.id).neq('status', 'closed')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const [{ data: messages }, { data: events }, { data: quotes }, { data: memory }, { data: followups }] = await Promise.all([
    conversation
      ? db.from('sales_messages').select('direction,sender,content_type,body,transcription,created_at')
          .eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(200)
      : Promise.resolve({ data: [] as any[] }),
    db.from('sales_lead_events').select('event_type,actor,payload,created_at')
      .eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(30),
    db.from('sales_quotes').select('quote_number,total,currency,status,valid_until,line_items')
      .eq('lead_id', lead.id).order('created_at', { ascending: false }),
    db.from('sales_contact_memory').select('summary,facts')
      .eq('contact_id', contact.id).maybeSingle(),
    db.from('sales_followups').select('reason,due_at,attempt_no')
      .eq('lead_id', lead.id).eq('status', 'pending').limit(3),
  ]);

  const handedOff = conversation?.status === 'handed_off';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/sales" className="text-xs text-zinc-500 hover:text-zinc-300">← Pipeline</Link>
          <h1 className="text-2xl font-semibold text-white mt-1">{contact.full_name ?? contact.phone}</h1>
          <div className="text-sm text-zinc-400 mt-1">
            {contact.phone} {contact.email ? `· ${contact.email}` : ''} {contact.company ? `· ${contact.company}` : ''} · via {lead.source} · score {lead.score}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full text-white ${STAGE_COLORS[lead.status] ?? 'bg-zinc-600'}`}>
            {lead.status.replace('_', ' ')}
          </span>
          {conversation && (
            <form action={toggleHandoff}>
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <input type="hidden" name="lead_id" value={lead.id} />
              <input type="hidden" name="to" value={handedOff ? 'ai' : 'human'} />
              <button className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${handedOff ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
                {handedOff ? '▶ Hand back to AI' : '✋ Take over as human'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200 flex justify-between">
            <span>Conversation</span>
            <span className={`text-xs ${handedOff ? 'text-amber-400' : 'text-emerald-400'}`}>
              {handedOff ? 'HUMAN OWNS THIS — AI is silent' : 'AI is handling'}
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-[32rem] overflow-y-auto">
            {(messages ?? []).map((m: any, i: number) => (
              <div key={i} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.direction === 'inbound' ? 'bg-white/10 text-zinc-100'
                  : m.sender === 'human' ? 'bg-amber-600/80 text-white'
                  : 'bg-emerald-600/80 text-white'
                }`}>
                  <div className="text-[10px] opacity-70 mb-0.5">
                    {m.direction === 'inbound' ? 'Customer' : m.sender === 'human' ? 'Human rep' : 'AI'} · {new Date(m.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                  {m.body ?? m.transcription ?? `[${m.content_type}]`}
                </div>
              </div>
            ))}
            {(messages ?? []).length === 0 && <div className="text-sm text-zinc-500">No messages yet.</div>}
          </div>
          {conversation && (
            <form action={sendHumanReply} className="p-3 border-t border-white/10 flex gap-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <input name="text" placeholder={handedOff ? 'Reply as human…' : 'Reply as human (AI keeps handling unless you take over)…'} className={inputCls} />
              <button className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-medium transition shrink-0">Send</button>
            </form>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-zinc-200 mb-3">Change status</div>
            <form action={changeStatus} className="flex gap-2">
              <input type="hidden" name="lead_id" value={lead.id} />
              <select name="status" defaultValue={lead.status} className={inputCls}>
                {Object.keys(STAGE_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white shrink-0">Set</button>
            </form>
            {(followups ?? []).length > 0 && (
              <div className="mt-3 text-xs text-zinc-400">
                Next AI follow-up: {new Date(followups![0].due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} ({followups![0].reason}, attempt {followups![0].attempt_no})
              </div>
            )}
          </div>

          {/* Qualification */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-zinc-200 mb-3">Qualification</div>
            {Object.keys(lead.qualification ?? {}).length ? (
              <dl className="space-y-1.5 text-sm">
                {Object.entries(lead.qualification).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-zinc-500 capitalize">{k}:</dt>
                    <dd className="text-zinc-200">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : <div className="text-sm text-zinc-500">Nothing collected yet</div>}
          </div>

          {/* Memory */}
          {memory?.summary && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-medium text-zinc-200 mb-2">AI memory of this customer</div>
              <p className="text-sm text-zinc-400">{memory.summary}</p>
            </div>
          )}

          {/* Quotes */}
          {(quotes ?? []).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-medium text-zinc-200 mb-3">Quotes</div>
              {quotes!.map((q: any) => (
                <div key={q.quote_number} className="text-sm mb-2">
                  <span className="font-mono text-zinc-300">{q.quote_number}</span>
                  <span className="text-white ml-2">{q.currency} {Number(q.total).toLocaleString()}</span>
                  <span className="text-zinc-500 ml-2">{q.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes + timeline */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-medium text-zinc-200 mb-3">Timeline & notes</div>
            <form action={addNote} className="flex gap-2 mb-3">
              <input type="hidden" name="lead_id" value={lead.id} />
              <input name="note" placeholder="Add internal note…" className={inputCls} />
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white shrink-0">Add</button>
            </form>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(events ?? []).map((e: any, i: number) => (
                <div key={i} className="text-xs text-zinc-400">
                  <span className="text-zinc-500">{new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                  <span className="text-zinc-300 ml-2">{e.event_type.replace(/_/g, ' ')}</span>
                  <span className="ml-1">{e.payload?.note ?? (e.payload?.to ? `→ ${e.payload.to}` : '')}</span>
                  <span className="text-zinc-600 ml-1">({e.actor})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
