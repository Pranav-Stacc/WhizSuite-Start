import type { APIRequestContext, Page } from '@playwright/test';
import { Permissions, type Permission } from '@agency-os/contracts';
import { SESSION_COOKIE, encodeSessionCookie, membershipRole } from './session-cookie';

const API_HOST = process.env.API_HOST ?? '127.0.0.1';
const API_PORT = process.env.API_PORT ?? '3001';
export const API_BASE = process.env.API_BASE_URL ?? `http://${API_HOST}:${API_PORT}/api`;

const WEB_HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const WEB_PORT = process.env.PLAYWRIGHT_WEB_PORT ?? '3000';
export const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://${WEB_HOST}:${WEB_PORT}`;

export const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? 'opm@gmail.com';
export const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD ?? '123456789012';
export const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL ?? 'opmclient@gmail.com';
export const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD ?? '123456789012';
export const CLIENT_ROLE_NAME = 'Client';

/** Staff routes guarded by a single primary permission (from app pages + nav). */
export const STAFF_ROUTE_GUARDS: { path: string; permission: Permission }[] = [
  { path: '/content', permission: Permissions.CONTENT_VIEW },
  { path: '/media', permission: Permissions.FILES_VIEW },
  { path: '/approvals', permission: Permissions.APPROVALS_VIEW },
  { path: '/chat', permission: Permissions.CHAT_VIEW },
  { path: '/invoices', permission: Permissions.INVOICES_VIEW },
  { path: '/reports', permission: Permissions.REPORTS_VIEW },
  { path: '/knowledge', permission: Permissions.ORG_VIEW },
  { path: '/clients', permission: Permissions.CLIENTS_VIEW },
  { path: '/tasks', permission: Permissions.TASKS_VIEW },
  { path: '/projects', permission: Permissions.PROJECTS_VIEW },
  { path: '/calendar', permission: Permissions.CALENDAR_VIEW },
  { path: '/time', permission: Permissions.TIME_TRACK },
  { path: '/leads', permission: Permissions.LEADS_VIEW },
  { path: '/automations', permission: Permissions.AUTOMATIONS_MANAGE },
  { path: '/workflows', permission: Permissions.WORKFLOWS_MANAGE },
  { path: '/integrations', permission: Permissions.INTEGRATIONS_MANAGE },
  { path: '/team', permission: Permissions.MEMBERS_VIEW },
  { path: '/departments', permission: Permissions.ORG_SETTINGS_MANAGE },
  { path: '/roles', permission: Permissions.ROLES_MANAGE },
  { path: '/billing', permission: Permissions.ORG_BILLING_MANAGE },
  { path: '/audit', permission: Permissions.AUDIT_VIEW },
];

/** Default Client role template — restored after matrix run. */
export const CLIENT_ROLE_BASELINE: Permission[] = [
  Permissions.ORG_VIEW,
  Permissions.CONTENT_VIEW,
  Permissions.APPROVALS_VIEW,
  Permissions.APPROVALS_APPROVE,
  Permissions.FEEDBACK_VIEW,
  Permissions.FEEDBACK_CREATE,
  Permissions.FILES_VIEW,
  Permissions.INVOICES_VIEW,
  Permissions.REPORTS_VIEW,
  Permissions.CHAT_VIEW,
  Permissions.CHAT_SEND,
];

export interface AuthSession {
  accessToken: string;
  organizationId: string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryOnRateLimit<T>(label: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('429') || attempt === 9) throw error;
      await sleep(750 * (attempt + 1));
    }
  }
  throw new Error(`${label}: rate limit retries exhausted`);
}

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthSession> {
  return retryOnRateLimit(`login ${email}`, async () => {
  const res = await request.post(`${API_BASE}/v1/auth/login`, {
    data: { email, password },
  });
  if (res.status() === 429) throw new Error(`login failed ${email}: 429`);
  if (!res.ok()) throw new Error(`login failed ${email}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return {
    accessToken: body.accessToken as string,
    organizationId: (body.organizationId ?? body.organization?.id) as string,
  };
  });
}

export async function fetchCapabilities(
  request: APIRequestContext,
  session: AuthSession,
): Promise<Permission[]> {
  return retryOnRateLimit('capabilities', async () => {
    const res = await request.get(`${API_BASE}/v1/access/capabilities`, {
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId,
      },
    });
    if (res.status() === 429) throw new Error('capabilities failed: 429');
    if (!res.ok()) throw new Error(`capabilities failed: ${res.status()}`);
    const body = await res.json();
    return body.permissions as Permission[];
  });
}

export async function findRoleId(
  request: APIRequestContext,
  owner: AuthSession,
  roleName: string,
): Promise<string> {
  const res = await request.get(`${API_BASE}/v1/organizations/${owner.organizationId}/roles`, {
    headers: {
      authorization: `Bearer ${owner.accessToken}`,
      'x-organization-id': owner.organizationId,
    },
  });
  if (!res.ok()) throw new Error(`list roles failed: ${res.status()}`);
  const body = await res.json();
  const raw = body.value ?? body.data ?? body;
  const rows = (Array.isArray(raw) ? raw : []) as Array<{ id: string; name: string }>;
  const role = rows.find((r) => r.name === roleName);
  if (!role) throw new Error(`role not found: ${roleName}`);
  return role.id;
}

export async function updateRolePermissions(
  request: APIRequestContext,
  owner: AuthSession,
  roleId: string,
  permissionKeys: Permission[],
): Promise<void> {
  await retryOnRateLimit('update role', async () => {
    const res = await request.patch(
      `${API_BASE}/v1/organizations/${owner.organizationId}/roles/${roleId}`,
      {
        headers: {
          authorization: `Bearer ${owner.accessToken}`,
          'x-organization-id': owner.organizationId,
        },
        data: { permissionKeys },
      },
    );
    if (res.status() === 429) throw new Error('update role failed: 429');
    if (!res.ok()) throw new Error(`update role failed: ${res.status()} ${await res.text()}`);
  });
}

/** Signs in via API and injects the signed session cookie (faster and avoids server-action redirect flakes). */
export async function applyWebSession(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<void> {
  const res = await request.post(`${API_BASE}/v1/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login failed ${email}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  const orgId = (body.organizationId ?? body.organization?.id) as string;
  const orgName = (body.organization?.name ?? 'Organization') as string;
  const orgSlug = body.organization?.slug as string | undefined;
  const user = body.user as { id: string; email: string; firstName: string; lastName?: string | null };
  const accessToken = body.accessToken as string;
  const refreshToken = body.refreshToken as string;

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: SESSION_COOKIE,
      value: encodeSessionCookie({
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        email: user.email,
        role: membershipRole(accessToken),
        orgId,
        orgName,
        orgSlug,
        accessToken,
        refreshToken,
        demo: false,
      }),
      url: WEB_BASE,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

export async function loginWeb(
  page: Page,
  email: string,
  password: string,
  request?: APIRequestContext,
): Promise<void> {
  const api = request ?? page.request;
  await applyWebSession(page, api, email, password);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/(dashboard|portal)(\?|$)/, { timeout: 30_000 });
}

export async function expectRouteAccess(
  page: Page,
  path: string,
  allowed: boolean,
): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  if (allowed) {
    await page.waitForURL(new RegExp(`${path.replace('/', '\\/')}(\\?|$)`), { timeout: 15_000 });
  } else {
    await page.waitForURL(/\/dashboard(\?|$)/, { timeout: 15_000 });
  }
}
