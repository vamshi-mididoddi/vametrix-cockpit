'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runTechAudit } from '../marketing/actions';

function fmt(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

export function TechAuditClient({ initialAudits }: { initialAudits: any[] }) {
  const router = useRouter();
  const [audits] = useState(initialAudits);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const latest = audits[0];

  function doRun() {
    startTransition(async () => {
      setFeedback('Running audit…');
      const r = await runTechAudit();
      if (r.ok) { setFeedback('Audit triggered — refresh in 10-15s.'); setTimeout(() => router.refresh(), 12000); }
      else setFeedback('✗ ' + (r.error || 'failed'));
    });
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold">Tracking infrastructure health</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Runs daily 9 AM IST. Click below to audit now.</p>
        </div>
        <button onClick={doRun} disabled={pending}
          className="px-3 py-1.5 text-xs rounded bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
          {pending ? 'Running…' : '🔧 Audit now'}
        </button>
      </div>
      {feedback && <div className="text-[11px] text-slate-400">{feedback}</div>}

      {!latest ? (
        <div className="bg-bg-card border border-bg-border border-dashed rounded-lg p-12 text-center text-sm text-slate-400">
          No audits run yet. Click "Audit now" to run the first one.
        </div>
      ) : (
        <>
          <div className={`bg-bg-card border rounded-lg p-5 ${latest.overall_status === 'healthy' ? 'border-accent-500/30' : latest.overall_status === 'broken' ? 'border-rose-500/30' : 'border-amber-500/30'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Latest audit · {fmt(latest.audited_at)}</div>
                <h3 className={`text-2xl font-semibold mt-1 ${latest.overall_status === 'healthy' ? 'text-accent-400' : latest.overall_status === 'broken' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {String(latest.overall_status || '—').replace(/_/g,' ').toUpperCase()}
                </h3>
              </div>
              <div className="text-[10px] text-slate-500">{(latest.issues || []).length} issues</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ToolCard name="Meta Pixel" status={latest.meta_pixel_status} extra={`${latest.meta_pixel_events_24h || 0} events/24h · pixel ${latest.meta_pixel_id || '—'}`} />
            <ToolCard name="Meta CAPI" status={latest.meta_capi_status} extra={`match quality: ${latest.meta_capi_match_quality || '—'}`} />
            <ToolCard name="GA4" status={latest.ga4_status} extra={latest.ga4_property_id || 'add GA4_PROPERTY_ID + GA4_API_SECRET'} />
            <ToolCard name="Google Tag Manager" status={latest.gtm_status} extra={latest.gtm_container_id || 'add GTM_CONTAINER_ID'} />
            <ToolCard name="Microsoft Clarity" status={latest.clarity_status} extra={latest.clarity_sessions_24h ? `${latest.clarity_sessions_24h} sessions/24h` : 'add CLARITY_API_TOKEN'} />
            <ToolCard name="WhatsApp ctwa_clid" status="healthy" extra={`engine #10 captures click ID on every inbound WA`} />
          </div>

          {(latest.issues || []).length > 0 && (
            <div className="bg-bg-card border border-bg-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Open issues</h3>
              <div className="space-y-2">
                {(latest.issues || []).map((iss: any, i: number) => (
                  <div key={i} className={`p-3 rounded border ${iss.severity === 'high' ? 'border-rose-500/30 bg-rose-500/5' : iss.severity === 'medium' ? 'border-amber-500/30 bg-amber-500/5' : 'border-bg-border bg-bg-soft'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{iss.tool}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${iss.severity === 'high' ? 'bg-rose-500/15 text-rose-300' : iss.severity === 'medium' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-600/30 text-slate-400'}`}>{iss.severity}</span>
                    </div>
                    <div className="text-xs text-slate-300">{iss.issue}</div>
                    {iss.recommended_fix && <div className="text-[11px] text-slate-500 mt-1">→ {iss.recommended_fix}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {audits.length > 1 && (
            <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-bg-border text-[10px] uppercase tracking-wider text-slate-500">Audit history</div>
              <table className="w-full">
                <thead className="bg-bg-soft border-b border-bg-border">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="text-left py-2 px-3">Time</th>
                    <th className="text-left py-2 px-3">Overall</th>
                    <th className="text-left py-2 px-3">Pixel</th>
                    <th className="text-left py-2 px-3">CAPI</th>
                    <th className="text-right py-2 px-3">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.slice(1).map(a => (
                    <tr key={a.id} className="border-b border-bg-border">
                      <td className="py-2 px-3 text-[11px] text-slate-400">{fmt(a.audited_at)}</td>
                      <td className="py-2 px-3 text-[11px]">{a.overall_status}</td>
                      <td className="py-2 px-3 text-[11px]">{a.meta_pixel_status}</td>
                      <td className="py-2 px-3 text-[11px]">{a.meta_capi_status}</td>
                      <td className="py-2 px-3 text-[11px] text-right">{(a.issues || []).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToolCard({ name, status, extra }: { name: string; status?: string | null; extra?: string }) {
  const color =
    status === 'healthy' ? 'border-accent-500/30 text-accent-400' :
    status === 'broken' || status === 'not_firing' ? 'border-rose-500/30 text-rose-400' :
    status === 'needs_key' ? 'border-slate-700 text-slate-500' :
    'border-amber-500/30 text-amber-400';
  return (
    <div className={`bg-bg-card border rounded-lg p-3 ${color}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{name}</div>
      <div className="text-sm font-medium mt-1">{String(status || '—').replace(/_/g,' ')}</div>
      {extra && <div className="text-[10px] text-slate-500 mt-1">{extra}</div>}
    </div>
  );
}
