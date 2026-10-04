import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'ao_session';
const PUBLIC_PATHS = ['/', '/login', '/register'];

/**
 * First-line gate: unauthenticated visitors never reach app routes.
 * Signature verification and role checks happen server-side in the layouts (requireSession / requireRole).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
