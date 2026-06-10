import { LandingPage } from '@/components/landing/landing';
import { ChatWidget } from '@/components/landing/chat-widget';

// Public marketing site — STATICALLY generated and served from the CDN (instant,
// no per-request server render, no auth round-trip). Logged-in visitors are
// redirected to /dashboard by middleware via a cheap cookie check (no network).
// ChatWidget is a client island that talks to /api/chat at runtime.
export const dynamic = 'force-static';

export default function Home() {
  return (
    <>
      <LandingPage />
      <ChatWidget />
    </>
  );
}
