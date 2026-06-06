'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitTemplate } from './actions';

export function SubmitTemplateForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState<'UTILITY' | 'MARKETING' | 'AUTHENTICATION'>('UTILITY');
  const [body, setBody] = useState('');
  const [params, setParams] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    if (!name || !body) {
      setFeedback('Name and body required');
      return;
    }
    setFeedback(null);
    const exParams = params.trim() ? params.split(',').map(s => s.trim()).filter(Boolean) : [];
    startTransition(async () => {
      const r = await submitTemplate({ template_name: name, language, category, body, example_params: exParams });
      if (r.ok) {
        setFeedback(`✓ submitted · status=${r.status || 'PENDING'}`);
        setName('');
        setBody('');
        setParams('');
        router.refresh();
        setTimeout(() => { setOpen(false); setFeedback(null); }, 3000);
      } else {
        setFeedback('✗ ' + (r.error || 'failed'));
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25"
      >
        + New template
      </button>
    );
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Submit new template to Meta</div>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-300">✕ Close</button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="text-[10px] uppercase text-slate-500 tracking-wider">Template name (snake_case)</label>
          <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="dcal_b2b_lead_intro" className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-slate-500 tracking-wider">Language</label>
          <input value={language} onChange={e => setLanguage(e.target.value)} className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-slate-500 tracking-wider">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as any)}
            className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm">
            <option value="UTILITY">UTILITY</option>
            <option value="MARKETING">MARKETING</option>
            <option value="AUTHENTICATION">AUTHENTICATION</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-slate-500 tracking-wider">Example values for {`{{1}},{{2}}…`} (comma-sep)</label>
          <input value={params} onChange={e => setParams(e.target.value)} placeholder="Rahul,Dcal RO water softeners"
            className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase text-slate-500 tracking-wider">Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
          placeholder="Hi {{1}}, thanks for your interest in {{2}}. Our team will reach out shortly. Reply STOP to opt out."
          className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={submit} disabled={pending || !name || !body}
          className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50">
          {pending ? 'Submitting…' : 'Submit to Meta'}
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.startsWith('✓') ? 'text-accent-400' : 'text-rose-400'}`}>{feedback}</span>
        )}
      </div>
      <div className="mt-2 text-[10px] text-slate-500">
        Meta typically approves UTILITY in 1–4 hours, MARKETING in 24–48h. <span className="font-mono">[VAMETRIX] 52</span> auto-syncs status to this page.
      </div>
    </div>
  );
}
