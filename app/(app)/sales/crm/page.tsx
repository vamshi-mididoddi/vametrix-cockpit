// VAMETRIX Sales — Call Desk (staff CRM).
// The human-in-the-loop stage: AI qualifies → staff calls → staff logs the
// outcome here → if set to follow-up, the AI takes the lead back and works it.
import { revalidatePath } from 'next/cache';
import { defaultOrg, salesDb } from '@/lib/salesos';

export const dynamic = 'force-dynamic';

async function logCallOutcome(formData: FormData) {
  'use server';
  const org = await defaultOrg();
  const db = salesDb();
  const leadId = String(formData.get('lead_id'));
  const outcome = String(formData.get('outcome'));
  const note = String(formData.get('note') ?? '').trim();
  const followupHours = Number(formData.get('followup_hours') || 24);

  // Record the staff action in the lead's permanent history.
  await db.from('sales_lead_events').insert({
    org_id: org.id, lead_id: leadId, event_type: 'staff_call_logged', actor: 'human',
    payload: { outcome, note },
  });

  const advance = async (status: string, reason: object = {}) =>
    db.rpc('sales_advance_lead', { p_lead_id: leadId, p_new_status: status, p_actor: 'human', p_reason: reason });

  const scheduleAiFollowup = async (reason: string, angle: string) => {
    await db.from('sales_followups').update({ status: 'superseded' })
      .eq('org_id', org.id).eq('lead_id', leadId).eq('status', 'pending');
    const due = new Date(Date.now() + followupHours * 3600_000).toISOString();
    await db.from('sales_followups').insert({
      org_id: org.id, lead_id: leadId, due_at: due, reason,
      context: { angle: `Staff call note: ${note || outcome}. ${angle}` },
    });
    await db.from('sales_leads').update({ next_action_at: due }).eq('id', leadId);
  };

  switch (outcome) {
    case 'interested_followup':
      await advance('negotiating', { via: 'staff_call' });
      await scheduleAiFollowup('no_reply', 'Customer spoke with our team and is interested — continue the conversation warmly and move toward closing.');
      break;
    case 'meeting_fixed':
      await advance('meeting_scheduled', { via: 'staff_call' });
      break;
    case 'won':
      await advance('won', { via: 'staff_call' });
      break;
    case 'lost':
      await db.from('sales_leads').update({ lost_reason: note || 'staff call' }).eq('id', leadId);
      await advance('lost', { reason: note });
      break;
    case 'no_answer':
      await scheduleAiFollowup('no_reply', 'Our team tried calling but could not reach them — re-engage on WhatsApp and offer to help there or fix a better time for a call.');
      break;
  }
  revalidatePath('/sales/crm');
}

const cardCls = 'rounded-xl border border-white/10 bg-white/[0.03]';
const inputCls = 'rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30';

export default async function CallDeskPage() {
  const org = await defaultOrg();
  const db = salesDb();

  const [{ data: toCall }, { data: aiWorking }] = await Promise.all([
    // AI finished qualification → staff's call queue
    db.from('sales_leads')
      .select('id,status,score,qualification,source,value_estimate,updated_at,sales_contacts(full_name,phone,company,city)')
      .eq('org_id', org.id).in('status', ['qualified', 'meeting_scheduled'])
      .order('score', { ascending: false }).limit(30),
    // Leads the AI is actively following up
    db.from('sales_followups')
      .select('due_at,reason,attempt_no,sales_leads(id,status,score,sales_contacts(full_name,phone))')
      .eq('org_id', org.id).eq('status', 'pending').order('due_at').limit(20),
  ]);

  const questions: Array<{ id: string; ask: string }> = org.config?.qualification?.questions ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-wider">VAMETRIX Sales OS · {org.name}</div>
        <h1 className="text-2xl font-semibold text-white mt-1">Call Desk</h1>
        <p className="text-sm text-zinc-400 mt-1">
          The AI qualified these leads — call them, then log what happened. Set a follow-up and the AI takes it from there.
        </p>
      </div>

      {/* Call queue */}
      <div className="space-y-4">
        {(toCall ?? []).length === 0 && (
          <div className={`${cardCls} p-6 text-sm text-zinc-400`}>
            No qualified leads waiting for a call right now. The AI is working the pipeline — qualified leads land here automatically.
          </div>
        )}
        {(toCall ?? []).map(lead => {
          const c: any = lead.sales_contacts;
          const qual: Record<string, any> = lead.qualification ?? {};
          return (
            <div key={lead.id} className={`${cardCls} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-white">{c?.full_name ?? 'Unknown'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">score {lead.score}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">{lead.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {c?.company ? `${c.company} · ` : ''}{c?.city ? `${c.city} · ` : ''}via {lead.source}
                  </div>
                  <a href={`tel:${c?.phone}`} className="inline-block mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition">
                    📞 Call {c?.phone}
                  </a>
                  <a href={`https://wa.me/${(c?.phone ?? '').replace('+', '')}`} target="_blank" rel="noreferrer"
                    className="inline-block mt-2 ml-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 text-sm transition">
                    WhatsApp thread
                  </a>
                </div>
                {/* What the AI learned */}
                <div className="text-xs text-zinc-400 space-y-1 min-w-[220px]">
                  <div className="uppercase tracking-wider text-zinc-500 mb-1">AI qualification</div>
                  {questions.map(q => (
                    <div key={q.id}>
                      <span className="text-zinc-500">{q.id}:</span>{' '}
                      <span className="text-zinc-200">{qual[q.id] !== undefined && qual[q.id] !== '' ? String(qual[q.id]) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcome logging */}
              <form action={logCallOutcome} className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
                <input type="hidden" name="lead_id" value={lead.id} />
                <select name="outcome" className={inputCls} required defaultValue="">
                  <option value="" disabled>Call outcome…</option>
                  <option value="interested_followup">Interested → AI follows up</option>
                  <option value="meeting_fixed">Meeting fixed</option>
                  <option value="won">Deal WON 🎉</option>
                  <option value="lost">Lost</option>
                  <option value="no_answer">No answer → AI re-engages</option>
                </select>
                <select name="followup_hours" className={inputCls} defaultValue="24">
                  <option value="4">AI follow-up in 4h</option>
                  <option value="24">AI follow-up in 24h</option>
                  <option value="72">AI follow-up in 3 days</option>
                </select>
                <input name="note" placeholder="Call notes (the AI reads this and continues accordingly)" className={`${inputCls} flex-1 min-w-[240px]`} />
                <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition">Log outcome</button>
              </form>
            </div>
          );
        })}
      </div>

      {/* AI working */}
      <div className={`${cardCls} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-white/10 text-sm font-medium text-zinc-200">
          🤖 AI is working these ({(aiWorking ?? []).length})
        </div>
        <div className="divide-y divide-white/5">
          {(aiWorking ?? []).map((f: any, i: number) => {
            const l = f.sales_leads; const c = l?.sales_contacts;
            return (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-zinc-200">{c?.full_name ?? c?.phone ?? 'Unknown'}</span>
                <span className="text-zinc-500 text-xs">{f.reason} · attempt {f.attempt_no}</span>
                <span className="text-zinc-400 text-xs">next touch {new Date(f.due_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            );
          })}
          {(aiWorking ?? []).length === 0 && <div className="px-4 py-5 text-sm text-zinc-500">Nothing scheduled right now</div>}
        </div>
      </div>
    </div>
  );
}
