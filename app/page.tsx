import { LandingPage } from '@/components/landing/landing';

// Public marketing site — STATICALLY generated and served from the CDN (instant,
// no per-request server render, no auth round-trip). Logged-in visitors are
// redirected to /dashboard by middleware via a cheap cookie check (no network).
export const dynamic = 'force-static';

export default function Home() {
  return <LandingPage />;
}
