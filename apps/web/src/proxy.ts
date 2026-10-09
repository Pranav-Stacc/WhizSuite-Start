import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, decodeSession, encodeSession, sessionCookieOptions } from '@/shared/auth/session-codec';
import { accessTokenNeedsRefresh, rotateTokens } from '@/shared/auth/token-refresh';

const PUBLIC_PATHS = ['/', '/login', '/register', '/invite', '/auth/expired'];

function redirectToLogin(request: NextRequest, expired: boolean): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = expired ? '?expired=1' : '';
  const response = NextResponse.redirect(url);
  if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
  return response;
}

/**
 * First-line gate: unauthenticated visitors never reach app routes, and live sessions get their
 * access token rotated here (the only server layer besides actions/route handlers that may set cookies).
 * Permission checks happen server-side in pages and layouts (requireSession / requirePermission).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = raw ? decodeSession(raw) : null;
  if (!session) return redirectToLogin(request, false);
  if (!session.accessToken || !session.refreshToken || !accessTokenNeedsRefresh(session.accessToken)) {
    return NextResponse.next();
  }

  const rotation = await rotateTokens(session.refreshToken);
  if (rotation.status === 'rejected') return redirectToLogin(request, true);
  if (rotation.status === 'unavailable') return NextResponse.next();

  const value = encodeSession({ ...session, ...rotation.tokens });
  request.cookies.set(SESSION_COOKIE, value);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, value, sessionCookieOptions);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
