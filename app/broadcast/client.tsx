'use client';

import { useState } from 'react';

interface Tpl {
  template_name: string;
  language: string;
  category: string;
  body: string;
}

interface Row {
  phone: string;
  name?: string;
  brand_interest?: string;
  language?: string;
  [k: string]: any;
}

interface SendResult {
  phone: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  detail?: string;
}

const WEBHOOK_URL = 'https://n8n.srv1048087.hstgr.cloud/webhook/vametrix-51-send-template';

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const row: Row = { phone: '' };
    header.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  }).filter(r => r.phone);
}

export function BroadcastClient({ templates }: { templates: Tpl[] }) {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [templateName, setTemplateName] = useState(templates[0]?.template_name || '');
  const [language, setLanguage] = useState(templates[0]?.language || 'en');
  const [rateLimitMs, setRateLimitMs] = useState(2000);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  const selectedTpl = templates.find(t => t.template_name === templateName);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvText(text);
      setRows(parseCsv(text));
    };
    reader.readAsText(f);
  }

  function onPaste(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setCsvText(e.target.value);
    setRows(parseCsv(e.target.value));
  }

  async function sendBatch() {
    if (rows.length === 0 || !templateName) return;
    setSending(true);
    setResults([]);
    setProgress({ sent: 0, failed: 0, total: rows.length });

    const acc: SendResult[] = [];
    let sent = 0, failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const body = {
        phone: r.phone,
        template_name: templateName,
        language: r.language || language,
        params: [r.name || 'there', r.brand_interest || 'Befach products'],
      };
      try {
        const resp = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          acc.push({ phone: r.phone, status: 'sent' });
          sent++;
        } else {
          const t = await resp.text().catch(() => '');
          acc.push({ phone: r.phone, status: 'failed', error: 'HTTP ' + resp.status, detail: t.slice(0, 200) });
          failed++;
        }
      } catch (e: any) {
        acc.push({ phone: r.phone, status: 'failed', error: String(e?.message || e) });
        failed++;
      }
      setResults([...acc]);
      setProgress({ sent, failed, total: rows.length });
      if (i < rows.length - 1) await new Promise(res => setTimeout(res, rateLimitMs));
    }
    setSending(false);
  }

  return (
    <div className="grid grid-cols-12 gap-6 max-w-7xl">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Step 1: pick template */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">Step 1 · Pick template</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Template ({templates.length} approved)</label>
              <select
                value={templateName}
                onChange={e => {
                  setTemplateName(e.target.value);
                  const t = templates.find(x => x.template_name === e.target.value);
                  if (t) setLanguage(t.language);
                }}
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"
              >
                {templates.length === 0 ? (
                  <option value="">(no approved templates yet)</option>
                ) : templates.map(t => (
                  <option key={t.template_name} value={t.template_name}>
                    {t.template_name} ({t.category} · {t.language})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Language override</label>
              <input
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full mt-1 bg-bg-soft border border-bg-border rounded px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          {selectedTpl && (
            <div className="mt-4 p-3 bg-bg-soft border border-bg-border rounded text-xs text-slate-300">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1.5">Preview</div>
              <div className="whitespace-pre-wrap leading-relaxed">{selectedTpl.body}</div>
              <div className="mt-2 text-[10px] text-slate-500">
                {`{{1}}`} = name · {`{{2}}`} = brand_interest (from CSV columns)
              </div>
            </div>
          )}
        </div>

        {/* Step 2: upload CSV */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">Step 2 · Upload contacts</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block">Upload CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="mt-1 text-xs file:bg-accent-500/10 file:text-accent-400 file:border-0 file:rounded file:px-3 file:py-1.5 file:mr-3 file:text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block">Or paste CSV text</label>
              <textarea
                value={csvText}
                onChange={onPaste}
                rows={4}
                placeholder="phone,name,brand_interest&#10;+919xxxxxxxxx,Rahul,Dcal RO water softeners"
                className="mt-1 w-full bg-bg-soft border border-bg-border rounded px-2 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            CSV header required: <code className="bg-bg-soft px-1.5 py-0.5 rounded text-slate-300">phone,name,brand_interest[,language]</code>
          </div>
        </div>

        {/* Step 3: send */}
        <div className="bg-bg-card border border-bg-border rounded-lg p-5">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">Step 3 · Review &amp; send</div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm">
              <span className="text-slate-400">Contacts loaded: </span>
              <span className="font-semibold">{rows.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Rate: </span>
              <input
                type="number"
                value={rateLimitMs}
                onChange={e => setRateLimitMs(Number(e.target.value) || 2000)}
                className="w-20 bg-bg-soft border border-bg-border rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-slate-500 ml-1">ms between sends</span>
            </div>
          </div>
          <button
            onClick={sendBatch}
            disabled={sending || rows.length === 0 || !templateName}
            className="px-4 py-2 text-sm rounded-md bg-accent-500/15 text-accent-300 border border-accent-500/30 hover:bg-accent-500/25 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {sending ? `Sending… ${progress.sent + progress.failed}/${progress.total}` : `Send to ${rows.length} contacts`}
          </button>

          {results.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div className="px-3 py-1.5 bg-accent-500/10 rounded text-accent-400">✅ Sent: {progress.sent}</div>
                <div className="px-3 py-1.5 bg-rose-500/10 rounded text-rose-400">❌ Failed: {progress.failed}</div>
                <div className="px-3 py-1.5 bg-bg-soft rounded text-slate-400">Total: {progress.total}</div>
              </div>
              <div className="bg-bg-soft border border-bg-border rounded max-h-80 overflow-y-auto scrollbar">
                <table className="w-full text-xs">
                  <thead className="bg-bg-card border-b border-bg-border">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="text-left py-1.5 px-2">Phone</th>
                      <th className="text-left py-1.5 px-2">Status</th>
                      <th className="text-left py-1.5 px-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b border-bg-border">
                        <td className="py-1.5 px-2 font-mono text-[11px]">{r.phone}</td>
                        <td className={`py-1.5 px-2 ${r.status === 'sent' ? 'text-accent-400' : 'text-rose-400'}`}>{r.status}</td>
                        <td className="py-1.5 px-2 text-slate-500 text-[10px]">{r.error || r.detail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right rail */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">How it works</div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li><span className="text-accent-400">›</span> Each row in your CSV becomes a templated WhatsApp send via <span className="font-mono text-slate-200">[VAMETRIX] 51</span></li>
            <li><span className="text-accent-400">›</span> Replies hit <span className="font-mono text-slate-200">[VAMETRIX] 50</span> → qualifier → smart nurture</li>
            <li><span className="text-accent-400">›</span> Rate-limited to stay safely under Meta's per-second cap</li>
            <li><span className="text-accent-400">›</span> Auto-dedupes against prior template sends to same phone (via `conversations` table)</li>
          </ul>
        </div>
        <div className="bg-bg-card border border-bg-border rounded-lg p-4">
          <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-3 font-semibold">CSV preview ({rows.length} rows)</div>
          {rows.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic">No contacts loaded yet.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto scrollbar">
              <table className="w-full text-[11px]">
                <thead className="text-slate-500 text-[9px] uppercase">
                  <tr>
                    <th className="text-left pb-1">Phone</th>
                    <th className="text-left pb-1">Name</th>
                    <th className="text-left pb-1">Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r, i) => (
                    <tr key={i} className="border-t border-bg-border">
                      <td className="py-1 font-mono">{r.phone}</td>
                      <td className="py-1">{r.name}</td>
                      <td className="py-1 truncate max-w-[120px]">{r.brand_interest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 30 && <div className="text-[10px] text-slate-500 mt-2">+{rows.length - 30} more rows</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
