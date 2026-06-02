# Vametrix Cockpit

Admin dashboard for the Vametrix Engine — the productized AI sales + marketing engine.

Customer #1: Befach International (Hyderabad, India).

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Supabase** (Postgres + Auth + Realtime) — same instance the engine uses
- **lucide-react** for icons
- Deployed on **Vercel** (free tier)

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open <http://localhost:3000>.

## Deploy

Push to `main`. Vercel auto-deploys.

Set environment variables in the Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — used by server components / actions)

## Build status

V1 scaffold — Engine Overview only. Per-agent pages, auth, and CRUD ship across the next sessions.

| Page | Status |
|---|---|
| Engine Overview | ✅ Scaffold |
| Agent #1 WhatsApp Qualifier | 🟡 Coming |
| Agent #8 Performance Marketer | 🟡 Coming |
| Agent #15 Analytics Reporter | 🟡 Coming |
| Auth (login + RLS) | 🟡 Coming |
| Per-agent placeholders | 🟡 Coming |

## License

Proprietary. © Befach International / Vametrix Engine.
