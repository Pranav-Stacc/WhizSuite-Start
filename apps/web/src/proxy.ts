import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  clearSessionCookie,
  decodeSession,
  encodeSession,
  sessionCookieOptions,
} from '@/shared/auth/session-codec';
import { accessTokenNeedsRefresh, rotateTokens } from '@/shared/auth/token-refresh';
import { parseWorkspaceHost, workspaceHref } from '@/shared/workspace/host';
import { isSharedPath, moduleForPath } from '@/shared/workspace/modules';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/invite',
  '/auth/expired',
  '/privacy',
  '/terms',
  '/data-deletion',
  '/portal-access',
]);

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function redirectToLogin(request: NextRequest, expired: boolean): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = expired ? '?expired=1' : '';
  const response = NextResponse.redirect(url);
  if (request.cookies.has(SESSION_COOKIE)) clearSessionCookie(response.cookies);
  return response;
}

function rootDomain(): string | undefined {
  return process.env.APP_ROOT_DOMAIN?.trim() || process.env.NEXT_PUBLIC_APP_ROOT_DOMAIN?.trim() || undefined;
}

/**
 * First-line gate: auth, token rotation, and CRM subdomain routing.
 * When APP_ROOT_DOMAIN is set, paths owned by another module redirect to
 * `crm-{slug}.…` / `{slug}.…`. Legacy `finance-{slug}` hosts hop onto main.
 */
export async function proxy(request: NextRequest) {
  const pathname = normalizePath(request.nextUrl.pathname);
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = raw ? decodeSession(raw) : null;
  if (!session) return redirectToLogin(request, false);

  const root = rootDomain();
  const host = parseWorkspaceHost(request.headers.get('host'), root);
  const pathModule = moduleForPath(pathname);

  // Staff must live on {slug}.root / crm-{slug}.root — never apex/www alone.
  if (root && session.orgSlug && !isSharedPath(pathname)) {
    const onWrongOrg = host.subdomainMode && host.orgSlug !== null && host.orgSlug !== session.orgSlug;
    const onApexOrWww = !host.subdomainMode;
    const onWrongModule = host.subdomainMode && pathModule !== host.module;
    const onLegacyFinance = Boolean(host.legacyFinanceHost);
    if (onApexOrWww || onWrongOrg || onWrongModule || onLegacyFinance) {
      const target = workspaceHref({
        module: pathModule,
        orgSlug: session.orgSlug,
        rootDomain: root,
        path: `${pathname}${request.nextUrl.search}`,
      });
      // Preflight + RSC flight fetches cannot follow cross-origin redirects (CORS).
      // Document navigations still hard-redirect; soft navigations must use ModuleLink.
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204 });
      }
      const isRsc =
        request.headers.get('RSC') === '1' ||
        request.headers.get('Next-Router-Prefetch') === '1' ||
        request.nextUrl.searchParams.has('_rsc');
      if (isRsc) {
        return new NextResponse(null, {
          status: 204,
          headers: {
            'x-module-hop': target,
            'cache-control': 'no-store',
          },
        });
      }
      return NextResponse.redirect(target);
    }
  }

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
