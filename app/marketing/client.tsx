'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  submitBrief, generateCreatives, approveAsset, approvePlan,
  pushToMeta, activateLaunch, killLaunch,
} from './actions';
import { BRAND_LABEL } from '@/lib/agents';

type Brief = any; type Plan = any; type Asset = any; type Launch = any; type Audit = any;

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

const BRAND_OPTS = ['mixed','dcal','dcal_hardwater','befach_diet','wellness','essentio','befach_imports','gcom'];

export function MarketingClient({
  initialBriefs, initialPlans, initialAssets, initialLaunches, lastAudit,
}: {
  initialBriefs: Brief[]; initialPlans: Plan[]; initialAssets: Asset[]; initialLaunches: Launch[]; lastAudit: Audit | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [briefs] = useState(initialBriefs);
  const [plans] = useState(initialPlans);
  const [assets] = useState(initialAssets);
  const [launches] = useState(initialLaunches);

  const [selectedBriefId, setSelectedBriefId] = useState<number | null>(briefs[0]?.id || null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state for new brief
  const [goal, setGoal] = useState('');
  const [brand, setBrand] = useState('mixed');
  const [geo, setGeo] = useState('Telangana');
  const [persona, setPersona] = useState('');
  const [dailyBudget, setDailyBudget] = useState<number | ''>('');
  const [totalBudget, setTotalBudget] = useState<number | ''>('');
  const [days, setDays] = useState<number>(30);
  const [notes, setNotes] = useState('');

  const planForBrief = useMemo(() => {
    if (!selectedBriefId) return null;
    return plans.find(p => p.brief_id === selectedBriefId) || null;
  }, [selectedBriefId, plans]);

  const assetsForBrief = useMemo(() => {
    if (!selectedBriefId) return [];
    return assets.filter(a => a.brief_id === selectedBriefId);
  }, [selectedBriefId, assets]);

  const launchesForBrief = useMemo(() => {
    if (!planForBrief) return [];
    return launches.filter(l => l.plan_id === planForBrief.id);
  }, [planForBrief, launches]);

  function showFeedback(msg: string, isErr = false) {
    setFeedback((isErr ? '✗ ' : '✓ ') + msg);
    setTimeout(() => setFeedback(null), 5000);
  }

  function doSubmit() {
    if (!goal.trim()) { showFeedback('Goal required', true); return; }
    startTransition(async () => {
      const r = await submitBrief({
        goal: goal.trim(),
        brand,
        target_geo: geo || 'Pan-India',
        target_persona: persona || undefined,
        budget_inr_daily: dailyBudget === '' ? undefined : Number(dailyBudget),
        budget_inr_total: totalBudget === '' ? undefined : Number(totalBudget),
        timeline_days: days || 30,
        notes: notes || undefined,
      });
      if (r.ok) {
        showFeedback(`Brief #${r.brief_id} submitted — strategist thinking…`);
        setGoal(''); setNotes('');
        setTimeout(() => router.refresh(), 1500);
      } else showFeedback(r.error || 'failed', true);
    });
  }

  function doGenerate(plan_id: number, variant_count?: number) {
    startTransition(async () => {
      showFeedback(`Generating ${variant_count || 6} creatives…`);
      const r = await generateCreatives(plan_id, variant_count);
      if (r.ok) {
        showFeedback(`Created ${r.total_rows_inserted || 0} rows · ${r.total_images_generated || 0} images`);
        router.refresh();
      } else showFeedback(r.error || 'failed', true);
    });
  }

  function doApproveAsset(asset_id: number, approve: boolean) {
    startTransition(async () => {
      const r = await approveAsset(asset_id, approve);
      if (r.ok) { router.refresh(); }
      else showFeedback(r.error || 'failed', true);
    });
  }

  function doApprovePlan(plan_id: number) {
    startTransition(async () => {
      const r = await approvePlan(plan_id);
      if (r.ok) { showFeedback('Plan approved'); router.refresh(); }
      else showFeedback(r.error || 'failed', true);
    });
  }

  function doPushToMeta(plan_id: number) {
    if (!confirm('Push this plan to Meta as PAUSED campaign? You can review in Meta Ads Manager before activating.')) return;
    startTransition(async () => {
      showFeedback('Creating campaign + ad sets in Meta…');
      const r = await pushToMeta(plan_id);
      if (r.ok) {
        showFeedback(`Drafted Meta campaign ${r.campaign_id || ''} (PAUSED)`);
        router.refresh();
      } else showFeedback(r.error || 'failed', true);
    });
  }

  function doActivate(campaign_id: string, plan_id?: number) {
    if (!confirm(`Activate Meta campaign ${campaign_id}? It will start spending immediately.`)) return;
    startTransition(async () => {
      showFeedback('Activating in Meta…');
      const r = await activateLaunch(campaign_id, plan_id);
      if (r.ok) { showFeedback('Campaign LIVE'); router.refresh(); }
      else showFeedback(r.error || 'failed', true);
    });
  }

  function doKill(campaign_id: string) {
    const reason = prompt('Why kill this campaign?');
    if (!reason) return;
    startTransition(async () => {
      const r = await killLaunch(campaign_id, reason);
      if (r.ok) { showFeedback('Killed'); router.refresh(); }
      else showFeedback(r.error || 'failed', true);
    });
  }

  return (
    <div className="max-w-[1600px] grid grid-cols-12 gap-5">
      {/* Top KPI bar */}
      <div className="col-span-12 grid grid-cols-5 gap-3">
        <Kpi label="Active briefs" value={String(briefs.filter(b => !['done','cancelled'].includes(b.status)).length)} />
        <Kpi label="Plans awaiting" value={String(plans.filter(p => p.approval_status === 'pending').length)} accent />
        <Kpi label="Assets pending review" value={String(assets.filter(a => a.approval_status === 'pending').length)} />
        <Kpi label="Launches awaiting approval" value={String(launches.filter(l => l.state === 'awaiting_approval').length)} accent />
        <Kpi label="Live campaigns" value={String(launches.filter(l => l.state === 'live').length)} />
      </div>

      {/* LEFT: brief intake + brief list */}
      <div className="col-span-4 space-y-5">
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md bg-accent-500/15 flex items-center justify-center text-accent-300">⚡</div>
            <div>
              <h3 className="text-sm font-semibold">Tell the strategist what you want</h3>
              <p className="text-[11px] text-slate-500">Plain English. It plans funnel, tech, creatives, campaigns.</p>
            </div>
          </div>

          <textarea
            rows={4}
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder='e.g. "Get me 50 dcal_b2c leads at under ₹200 CAC in Telangana over the next 30 days"'
            className="w-full bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-accent-500/50"
          />

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Field label="Brand">
              <select value={brand} onChange={e => setBrand(e.target.value)}
                className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs">
                {BRAND_OPTS.map(b => <option key={b} value={b}>{BRAND_LABEL[b] || b}</option>)}
              </select>
            </Field>
            <Field label="Geo">
              <input value={geo} onChange={e => setGeo(e.target.value)}
                className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs" />
            </Field>
            <Field label="Persona (optional)">
              <input value={persona} onChange={e => setPersona(e.target.value)} placeholder="softener installers"
                className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs" />
            </Field>
            <Field label="Days">
              <input type="number" value={days} onChange={e => setDays(Number(e.target.value) || 30)}
                className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs" />
            </Field>
            <Field label="Daily ₹">
              <input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="optional" className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs" />
            </Field>
            <Field label="Total ₹">
              <input type="number" value={totalBudget} onChange={e => setTotalBudget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="optional" className="w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs" />
            </Field>
          </div>

          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…"
            className="mt-2 w-full bg-bg-soft border border-bg-border rounded px-3 py-1.5 text-xs placeholder:text-slate-600" />

          <button onClick={doSubmit} disabled={pending || !goal.trim()}
            className="mt-3 w-full px-4 py-2 text-sm rounded-md bg-accent-500/20 text-accent-300 border border-accent-500/40 hover:bg-accent-500/30 disabled:opacity-50">
            {pending ? 'Working…' : '⚡ Plan strategy'}
          </button>
          {feedback && (
            <div className={`mt-2 text-[11px] ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</div>
          )}
        </div>

        {/* Brief list */}
        <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-bg-border text-[10px] uppercase tracking-wider text-slate-500">Recent briefs</div>
          <div className="max-h-[420px] overflow-y-auto scrollbar">
            {briefs.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">No briefs yet. Submit your first goal above.</div>
            ) : briefs.map(b => {
              const isActive = b.id === selectedBriefId;
              const statusCol = b.status === 'live' ? 'bg-accent-500' :
                b.status === 'plan_ready' ? 'bg-violet-400' :
                b.status === 'planning' ? 'bg-sky-400 animate-pulse' :
                b.status === 'cancelled' ? 'bg-slate-600' : 'bg-slate-500';
              return (
                <button key={b.id} onClick={() => setSelectedBriefId(b.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-bg-border flex items-start gap-2.5 hover:bg-bg-cardhover ${isActive ? 'bg-accent-500/5 border-l-2 border-l-accent-500' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCol} mt-1.5 shrink-0`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{b.goal}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>#{b.id}</span>
                      <span className="text-slate-600">·</span>
                      <span>{BRAND_LABEL[b.brand] || b.brand}</span>
                      <span className="text-slate-600">·</span>
                      <span>{b.target_geo}</span>
                      <span className="text-slate-600">·</span>
                      <span className="uppercase tracking-wider">{b.status}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: plan view + creatives + launches */}
      <div className="col-span-8 space-y-5">
        {!selectedBriefId ? (
          <Empty>Select or submit a brief on the left to see its strategy.</Empty>
        ) : !planForBrief ? (
          <Empty>
            Strategist is thinking…
            <div className="text-[11px] text-slate-500 mt-1">Refresh in 20-30s.</div>
          </Empty>
        ) : (
          <>
            <PlanView
              plan={planForBrief}
              onApprove={() => doApprovePlan(planForBrief.id)}
              onGenerateCreatives={(n) => doGenerate(planForBrief.id, n)}
              onPushToMeta={() => doPushToMeta(planForBrief.id)}
            />
            <CreativeGallery
              assets={assetsForBrief}
              onApprove={doApproveAsset}
              onReject={(id) => doApproveAsset(id, false)}
            />
            <LaunchTable
              launches={launchesForBrief}
              onActivate={(cid, pid) => doActivate(cid, pid)}
              onKill={(cid) => doKill(cid)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grad-card border border-bg-border rounded-lg p-3">
      <div className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? 'text-accent-400' : ''}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-slate-500 tracking-wider">{label}</label>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: any }) {
  return (
    <div className="bg-bg-card border border-bg-border border-dashed rounded-lg p-12 text-center">
      <div className="text-sm text-slate-400">{children}</div>
    </div>
  );
}

function PlanView({ plan, onApprove, onGenerateCreatives, onPushToMeta }: { plan: any; onApprove: () => void; onGenerateCreatives: (n?: number) => void; onPushToMeta: () => void }) {
  const funnel = plan.funnel || {};
  const cb = plan.creative_brief || {};
  const kpi = plan.projected_kpis || {};
  const bb = plan.budget_breakdown || {};
  const tc = plan.tech_checklist || [];
  const cs = plan.campaign_structure || [];
  const isApproved = plan.approval_status === 'approved';

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold">Strategy plan #{plan.id}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{plan.goal_summary}</p>
          <p className="text-xs text-slate-300 mt-2 italic">{plan.strategy_thesis}</p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isApproved && <button onClick={onApprove} className="px-3 py-1.5 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">Approve plan</button>}
          {isApproved && <span className="px-3 py-1.5 text-xs rounded bg-accent-500/10 text-accent-400 border border-accent-500/30">✓ Approved</span>}
          <button onClick={() => onGenerateCreatives(cb.image_variants_needed || 6)} className="px-3 py-1.5 text-xs rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25">
            🎨 Generate {cb.image_variants_needed || 6} creatives
          </button>
          <button onClick={onPushToMeta} disabled={!isApproved} className="px-3 py-1.5 text-xs rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
            🚀 Push to Meta (PAUSED)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(['TOFU','MOFU','BOFU'] as const).map(stage => (
          <div key={stage} className="bg-bg-soft border border-bg-border rounded p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{stage}</div>
            <div className="text-xs font-medium mt-1">{funnel[stage]?.objective || '—'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{funnel[stage]?.primary_kpi || ''}</div>
            <div className="text-[10px] text-accent-400 mt-1">Budget: {funnel[stage]?.budget_pct || 0}%</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Section title="Projected KPIs">
          <KV k="Leads/day" v={String(kpi.leads_per_day || '—')} />
          <KV k="CPL (raw)" v={`₹${kpi.cpl_inr || '—'}`} />
          <KV k="CPL (qualified)" v={`₹${kpi.cpql_inr || '—'}`} />
          <KV k="Qualified rate" v={`${kpi.qualified_rate_pct || '—'}%`} />
          <KV k="ROAS estimate" v={`${kpi.roas_estimate_x || '—'}x`} />
          <KV k="Payback" v={`${kpi.payback_days || '—'}d`} />
          <KV k="Confidence" v={kpi.confidence || '—'} />
        </Section>
        <Section title="Budget breakdown">
          <KV k="Daily" v={`₹${bb.daily_inr || '—'}`} />
          <KV k="30-day" v={`₹${bb.total_inr_30d || '—'}`} />
          <KV k="TOFU/day" v={`₹${bb.TOFU_inr_daily || '—'}`} />
          <KV k="MOFU/day" v={`₹${bb.MOFU_inr_daily || '—'}`} />
          <KV k="BOFU/day" v={`₹${bb.BOFU_inr_daily || '—'}`} />
          {bb.rationale && <div className="col-span-2 text-[10px] text-slate-500 italic mt-1">{bb.rationale}</div>}
        </Section>
      </div>

      <Section title={`Tech checklist (${tc.length})`}>
        <div className="col-span-2 space-y-1">
          {tc.map((t: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${t.status === 'verified' ? 'bg-accent-500' : t.status === 'must_verify' ? 'bg-amber-500' : 'bg-slate-600'}`} />
              <div className="flex-1">
                <span className="text-slate-200">{t.item}</span>
                <span className="text-slate-500"> — {t.why}</span>
                {t.action && t.action !== 'none' && <span className="text-amber-400"> → {t.action}</span>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Campaign structure (${cs.length})`}>
        <div className="col-span-2 space-y-2">
          {cs.map((c: any, i: number) => (
            <div key={i} className="bg-bg-soft border border-bg-border rounded p-2">
              <div className="text-xs font-medium">{c.name} <span className="text-[10px] text-slate-500">({c.objective}, {c.budget_strategy || 'ABO'}, ₹{c.daily_budget_inr || 0}/d, {c.stage || 'MOFU'})</span></div>
              {(c.ad_sets || []).map((as: any, j: number) => (
                <div key={j} className="text-[10px] text-slate-500 mt-1 pl-3 border-l border-bg-border">
                  ↳ {as.name} · {as.audience} · {(as.placements || []).join('+')} · ₹{as.daily_budget_inr || 0}/d · {as.creatives_count || 0} creatives
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {(plan.risks || []).length > 0 && (
        <Section title="Risks">
          <div className="col-span-2 space-y-1">
            {plan.risks.map((r: any, i: number) => (
              <div key={i} className="text-[11px]">
                <span className="text-amber-400">⚠ </span>
                <span className="text-slate-300">{r.risk}</span>
                <span className="text-slate-500"> → {r.mitigation}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="border-t border-bg-border pt-3 mt-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">{title}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 bg-bg-soft border border-bg-border rounded">
      <span className="text-[10px] text-slate-500">{k}</span>
      <span className="text-xs font-mono">{v}</span>
    </div>
  );
}

function CreativeGallery({ assets, onApprove, onReject }: { assets: any[]; onApprove: (id: number, approve: boolean) => void; onReject: (id: number) => void }) {
  const images = assets.filter(a => a.kind === 'image');
  const copies = assets.filter(a => a.kind?.startsWith('copy_'));

  if (assets.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-5">
        <h3 className="text-sm font-semibold mb-1">Creatives</h3>
        <p className="text-[11px] text-slate-500">No creatives yet. Click "Generate creatives" above — Nano Banana will produce ad images and Gemini will write copy variants.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Creatives ({assets.length})</h3>
        <div className="text-[10px] text-slate-500">{images.length} images · {copies.length} copy variants</div>
      </div>

      {images.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Images (Nano Banana)</div>
          <div className="grid grid-cols-3 gap-3">
            {images.map(a => (
              <div key={a.id} className={`border rounded-lg overflow-hidden ${a.approval_status === 'approved' ? 'border-accent-500/40' : a.approval_status === 'rejected' ? 'border-rose-500/30 opacity-50' : 'border-bg-border'}`}>
                {a.url ? (
                  <img src={a.url} alt={a.hook || ''} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-bg-soft flex items-center justify-center text-slate-600 text-xs">No image</div>
                )}
                <div className="p-2 bg-bg-soft">
                  <div className="text-[10px] text-accent-300 font-medium">{a.message_pillar}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{a.hook}</div>
                  <div className="flex items-center gap-1 mt-2">
                    {a.approval_status === 'pending' && (
                      <>
                        <button onClick={() => onApprove(a.id, true)} className="flex-1 px-2 py-1 text-[10px] rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25">✓ Approve</button>
                        <button onClick={() => onReject(a.id)} className="flex-1 px-2 py-1 text-[10px] rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/15">✗ Reject</button>
                      </>
                    )}
                    {a.approval_status === 'approved' && <span className="flex-1 text-center text-[10px] text-accent-400">✓ APPROVED</span>}
                    {a.approval_status === 'rejected' && <span className="flex-1 text-center text-[10px] text-rose-400">✗ REJECTED</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {copies.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Copy variants</div>
          <div className="grid grid-cols-2 gap-2">
            {copies.map(a => (
              <div key={a.id} className={`px-3 py-2 border rounded text-xs ${a.approval_status === 'approved' ? 'border-accent-500/40 bg-accent-500/5' : a.approval_status === 'rejected' ? 'border-rose-500/20 opacity-50' : 'border-bg-border bg-bg-soft'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">{a.kind.replace('copy_','')} · {a.message_pillar}</span>
                  <div className="flex gap-1">
                    {a.approval_status === 'pending' && (
                      <>
                        <button onClick={() => onApprove(a.id, true)} className="text-[10px] text-accent-400 hover:text-accent-300">✓</button>
                        <button onClick={() => onReject(a.id)} className="text-[10px] text-rose-400 hover:text-rose-300">✗</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-slate-200">{a.text_content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LaunchTable({ launches, onActivate, onKill }: { launches: any[]; onActivate: (cid: string, pid?: number) => void; onKill: (cid: string) => void }) {
  if (launches.length === 0) return null;
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5">
      <h3 className="text-sm font-semibold mb-3">Meta launches ({launches.length})</h3>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-bg-border">
            <th className="text-left py-1.5">Campaign</th>
            <th className="text-left py-1.5">State</th>
            <th className="text-right py-1.5">Daily ₹</th>
            <th className="text-left py-1.5">Created</th>
            <th className="text-right py-1.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {launches.map(l => (
            <tr key={l.id} className="border-b border-bg-border hover:bg-bg-cardhover">
              <td className="py-2">
                <div className="text-xs font-mono">{l.campaign_name || l.campaign_id}</div>
                <div className="text-[10px] text-slate-500">{(l.ad_set_ids || []).length} ad sets · {l.objective}</div>
              </td>
              <td className="py-2">
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                  l.state === 'live' ? 'bg-accent-500/15 text-accent-300' :
                  l.state === 'awaiting_approval' ? 'bg-amber-500/15 text-amber-300' :
                  l.state === 'killed' ? 'bg-rose-500/15 text-rose-300' :
                  'bg-slate-600/30 text-slate-400'
                }`}>{l.state}</span>
              </td>
              <td className="py-2 text-right text-xs font-mono">₹{l.daily_budget_inr || 0}</td>
              <td className="py-2 text-[10px] text-slate-500">{fmt(l.created_at)}</td>
              <td className="py-2 text-right">
                {l.state === 'awaiting_approval' && l.campaign_id && (
                  <button onClick={() => onActivate(l.campaign_id, l.plan_id)} className="px-2 py-0.5 text-[10px] rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 mr-1">Activate</button>
                )}
                {(l.state === 'live' || l.state === 'awaiting_approval') && l.campaign_id && (
                  <button onClick={() => onKill(l.campaign_id)} className="px-2 py-0.5 text-[10px] rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20">Kill</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
