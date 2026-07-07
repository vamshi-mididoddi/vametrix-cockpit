// Environment access — Vercel/serverless edition: process.env only.
// (The standalone laptop engine keeps its own file-reading loader; this copy
// runs inside Next.js where Vercel injects env vars directly.)
export function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export function envOr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const PORT = Number(envOr('ENGINE_PORT', '8787'));