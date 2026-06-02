import { TopBar } from '@/components/topbar';
import { AGENTS, INFRA, STATUS_META } from '@/lib/agents';
import * as Icons from 'lucide-react';
import { notFound } from 'next/navigation';

function Icon({ name, className }: { name: string; className?: string }) {
  const pascal = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
  const C = (Icons as any)[pascal] ?? Icons.Square;
  return <C className={className} strokeWidth={1.75} />;
}

export default function Page({ params }: { params: { slug: string } }) {
  const agent = AGENTS.find(a => a.id === params.slug);
  const infra = INFRA.find(i => i.id === params.slug);

  if (!agent && !infra) return notFound();

  if (agent) {
    const m = STATUS_META[agent.status];
    const copy = agent.planCopy;
    return (
      <>
        <TopBar title={`#${String(agent.num).padStart(2, '0')} · ${agent.name}`} breadcrumb={agent.fleet} />
        <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6 animate-fade-in">
          <div className="mb-6 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${m.bg} ${m.color} flex items-center justify-center`}>
              <Icon name={agent.icon} className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{agent.name}</h1>
                <span className={`stage-badge ${m.bg} ${m.color} ${m.border} border`}>
                  <span className={`w-1 h-1 rounded-full ${m.dot}`} />{m.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl mt-1">{agent.desc}</p>
            </div>
          </div>

          {agent.status === 'live' && (
            <div className="bg-bg-card border border-bg-border rounded-lg p-5 text-xs text-slate-400">
              <p className="text-slate-300 mb-2">Live page coming in the next build session.</p>
              <p>For agent #1, #8, #15 the production pages render real data from Supabase here (kanban + inbox + decision queue + briefs). Scaffold is in place — pages get wired one per session.</p>
            </div>
          )}

          {agent.status === 'parked' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 text-xs text-amber-200">
              <p className="font-semibold mb-1">Parked</p>
              <p>{agent.desc}</p>
            </div>
          )}

          {agent.status === 'planned' && copy && (
            <div className="max-w-4xl">
              <div className="grad-card border border-bg-border rounded-lg p-6 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">What this agent does</div>
                <p className="text-sm text-slate-200 leading-relaxed">{copy.whatItDoes}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PlanBox title="Inputs" items={copy.inputs} />
                <PlanBox title="Outputs" items={copy.outputs} />
              </div>
              <div className={`mt-4 p-4 ${m.bg} ${m.border} border rounded-lg flex items-center justify-between`}>
                <div className="text-xs"><span className="text-slate-400">Planned for: </span><span className={`font-medium ${m.color}`}>{copy.eta}</span></div>
                <span className={`stage-badge ${m.bg} ${m.color}`}>{m.label}</span>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Infrastructure page
  const i = infra!;
  const m = STATUS_META[i.status];
  return (
    <>
      <TopBar title={i.label} breadcrumb="Infrastructure" />
      <div className="flex-1 overflow-y-auto scrollbar bg-bg p-6 animate-fade-in">
        <div className="mb-6 flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${m.bg} ${m.color} flex items-center justify-center`}>
            <Icon name={i.icon} className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{i.label}</h1>
              <span className={`stage-badge ${m.bg} ${m.color} ${m.border} border`}>
                <span className={`w-1 h-1 rounded-full ${m.dot}`} />{m.label}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-lg p-5 text-xs text-slate-400">
          <p className="text-slate-300 mb-2">Infrastructure module — scaffold in place.</p>
          <p>Each module's UI ships across the next sessions. Knowledge Base, WA Templates, Workflows table, Cost Monitor, Team & Roles, Audit Log, Settings.</p>
        </div>
      </div>
    </>
  );
}

function PlanBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500 italic">to be defined</div>
      ) : (
        <ul className="space-y-1.5 text-xs text-slate-300">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">›</span>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
