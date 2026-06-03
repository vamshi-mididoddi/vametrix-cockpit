import { TopBar } from '@/components/topbar';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STATUS_COLOR: Record<string, string> = {
  APPROVED: 'bg-accent-500/15 text-accent-400 border-accent-500/30',
  PENDING:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  REJECTED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  PAUSED:   'bg-slate-700/30 text-slate-400 border-slate-700',
  DISABLED: 'bg-slate-700/30 text-slate-500 border-slate-700',
};

async function loadTemplates() {
  const supa = supabaseAdmin();
  const { data } = await supa
    .from('wa_templates')
    .select('*')
    .order('approved_at', { ascending: false, nullsFirst: false });
  return (data || []) as any[];
}

export default async function Page() {
  const tpls = await loadTemplates();
  const approved = tpls.filter(t => t.status === 'APPROVED').length;
  const pending = tpls.filter(t => t.status === 'PENDING').length;
  const rejected = tpls.filter(t => t.status === 'REJECTED').length;

  return (
    <>
      <TopBar title="WhatsApp Templates" breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 max-w-4xl">
          <div className="grad-card border border-bg-border rounded-lg p-3">
            <div className="text-[11px] uppercase text-slate-500 tracking-wider">Total</div>
            <div className="text-2xl font-semibold mt-1">{tpls.length}</div>
          </div>
          <div className="grad-card border border-bg-border rounded-lg p-3">
            <div className="text-[11px] uppercase text-slate-500 tracking-wider">Approved</div>
            <div className="text-2xl font-semibold mt-1 text-accent-400">{approved}</div>
          </div>
          <div className="grad-card border border-bg-border rounded-lg p-3">
            <div className="text-[11px] uppercase text-slate-500 tracking-wider">Pending</div>
            <div className="text-2xl font-semibold mt-1 text-amber-400">{pending}</div>
          </div>
          <div className="grad-card border border-bg-border rounded-lg p-3">
            <div className="text-[11px] uppercase text-slate-500 tracking-wider">Rejected</div>
            <div className="text-2xl font-semibold mt-1 text-rose-400">{rejected}</div>
          </div>
        </div>

        <div className="mb-3 flex items-end justify-between">
          <h3 className="text-sm font-semibold">Template library</h3>
          <button disabled className="px-3 py-1.5 text-xs rounded-md bg-accent-500/10 text-accent-400 border border-accent-500/30 opacity-60 cursor-not-allowed">
            + New template (coming next session)
          </button>
        </div>

        <div className="bg-bg-card border border-bg-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-soft border-b border-bg-border">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-left py-2 px-3">Lang</th>
                <th className="text-left py-2 px-3">Body</th>
                <th className="text-left py-2 px-3">Meta ID</th>
              </tr>
            </thead>
            <tbody>
              {tpls.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-slate-500 text-sm">No templates yet.</td></tr>
              ) : tpls.map(t => {
                const cls = STATUS_COLOR[t.status] || 'bg-slate-700 text-slate-300';
                const bodyPreview = (t.body || '').replace(/\s+/g, ' ').slice(0, 90);
                return (
                  <tr key={t.template_name} className="border-b border-bg-border hover:bg-bg-cardhover">
                    <td className="py-2 px-3 text-xs font-mono">{t.template_name}</td>
                    <td className="py-2 px-3"><span className={`stage-badge border ${cls}`}>{t.status}</span></td>
                    <td className="py-2 px-3 text-[11px] text-slate-400">{t.category}</td>
                    <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">{t.language}</td>
                    <td className="py-2 px-3 text-xs text-slate-300 max-w-md">{bodyPreview}</td>
                    <td className="py-2 px-3 text-[10px] text-slate-600 font-mono">{t.meta_template_id || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 max-w-3xl text-xs text-slate-500 bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-slate-300 mb-2 font-medium">How templates work in Vametrix</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Submit new templates via the Meta API (or this page — coming next session).</li>
            <li><span className="font-mono text-accent-400">[VAMETRIX] 52</span> auto-polls Meta every 30 min and updates this table.</li>
            <li>Telegram alert fires on newly APPROVED or REJECTED.</li>
            <li>Use approved templates via <span className="font-mono">/broadcast</span> for bulk sends or <span className="font-mono">[VAMETRIX] 51</span> webhook for single sends.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
