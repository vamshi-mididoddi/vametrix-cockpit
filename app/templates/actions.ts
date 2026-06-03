'use server';

const SUBMIT_WEBHOOK = 'https://n8n.srv1048087.hstgr.cloud/webhook/vametrix-42-submit-template';

export async function submitTemplate(input: {
  template_name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  body: string;
  example_params?: string[];
}): Promise<{ ok: boolean; error?: string; status?: string; meta_template_id?: string | null }> {
  if (!input.template_name || !input.body) return { ok: false, error: 'template_name and body required' };
  try {
    const r = await fetch(SUBMIT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { ok: false, error: `HTTP ${r.status}: ${t.slice(0, 200)}` };
    }
    const j = await r.json().catch(() => ({}));
    return { ok: true, status: j.status, meta_template_id: j.meta_template_id };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
