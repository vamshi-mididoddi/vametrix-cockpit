import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// PUBLIC routes anyone can visit (no auth check):
const PUBLIC_PATHS = ['/login', '/auth', '/_next', '/favicon', '/api/telegram'];
const PUBLIC_EXACT = new Set(['/']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function toLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Landing page: served statically to anonymous visitors (fast, CDN-cached).
  // Logged-in visitors are bounced to their dashboard via a cheap cookie check
  // (no Supabase network round-trip — the dashboard itself validates the session).
  if (pathname === '/') {
    const hasAuthCookie = req.cookies.getAll().some(c => c.name.includes('-auth-token'));
    if (hasAuthCookie) {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Public paths render without any auth check
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env isn't available to the middleware, never crash — just
  // send the visitor to /login (which will surface a clear config error).
  if (!SUPA_URL || !SUPA_ANON) {
    return toLogin(req);
  }

  let res = NextResponse.next();
  let user = null;
  try {
    const supabase = createServerClient(SUPA_URL, SUPA_ANON, {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: any) { res.cookies.set({ name, value, ...options }); },
        remove(name: string, options: any) { res.cookies.set({ name, value: '', ...options }); },
      },
    });
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Auth lookup failed for any reason → treat as logged out, don't crash.
    return toLogin(req);
  }

  if (!user) return toLogin(req);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
