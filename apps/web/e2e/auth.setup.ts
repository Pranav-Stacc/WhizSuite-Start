import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test as setup } from '@playwright/test';
import {
  SESSION_COOKIE,
  encodeSessionCookie,
  membershipRole,
  type E2eSessionPayload,
} from './session-cookie';

const API_HOST = process.env.API_HOST ?? '127.0.0.1';
const API_PORT = process.env.API_PORT ?? '3001';
const API_BASE = process.env.API_BASE_URL ?? `http://${API_HOST}:${API_PORT}/api`;
const WEB_HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const WEB_PORT = process.env.PLAYWRIGHT_WEB_PORT ?? '3000';
const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://${WEB_HOST}:${WEB_PORT}`;
const AUTH_DIR = path.join(__dirname, '.auth');
const CREDS_PATH = path.join(AUTH_DIR, 'credentials.json');
const STORAGE_PATH = path.join(AUTH_DIR, 'owner.json');

setup('provision live owner session', async ({ browser, request }) => {
  const health = await request.get(`${API_BASE}/health`);
  if (!health.ok()) {
    throw new Error(`API not ready at ${API_BASE}/health (${health.status()})`);
  }

  const presetEmail = process.env.E2E_EMAIL?.trim();
  const presetPassword = process.env.E2E_PASSWORD;
  const usePreset = Boolean(presetEmail && presetPassword);

  const slug = `e2e-${Date.now()}`;
  const email = usePreset ? presetEmail! : `e2e-${Date.now()}@test.agency`;
  const password = usePreset ? presetPassword! : 'SecurePass123!@#';

  let registeredWorkspaceId = '';

  if (!usePreset) {
    const register = await request.post(`${API_BASE}/v1/auth/register`, {
      data: {
        email,
        password,
        firstName: 'E2E',
        lastName: 'Owner',
        organizationName: 'E2E Agency',
        organizationSlug: slug,
      },
    });
    if (!register.ok()) {
      throw new Error(`Register failed (${register.status()}): ${await register.text()}`);
    }

    const registered = (await register.json()) as {
      accessToken?: string;
      organization?: { id: string };
      organizationId?: string;
      defaultWorkspace?: { id: string };
    };
    registeredWorkspaceId = registered.defaultWorkspace?.id ?? '';
  }

  const loginRes = await request.post(`${API_BASE}/v1/auth/login`, {
    data: { email, password },
  });
  if (!loginRes.ok()) {
    throw new Error(`Login failed (${loginRes.status()}): ${await loginRes.text()}`);
  }
  const session = (await loginRes.json()) as {
    accessToken: string;
    refreshToken: string;
    organizationId?: string;
    user: { id: string; email: string; firstName: string; lastName?: string | null };
  };
  const accessToken = session.accessToken;
  if (!accessToken) {
    throw new Error('No access token after login');
  }
  const orgId = session.organizationId ?? '';
  if (!orgId) {
    throw new Error('No organization id after login');
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-organization-id': orgId,
  };

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const caps = await request.get(`${API_BASE}/v1/access/capabilities`, { headers });
    if (caps.ok()) {
      const permissions = new Set(((await caps.json()) as { permissions: string[] }).permissions);
      if (permissions.has('workspaces.view')) break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  let workspaceId = registeredWorkspaceId;
  for (let attempt = 0; workspaceId === '' && attempt < 30; attempt += 1) {
    const workspacesRes = await request.get(`${API_BASE}/v1/organizations/${orgId}/workspaces`, {
      headers,
    });
    if (workspacesRes.ok()) {
      const workspaces = (await workspacesRes.json()) as Array<{ id: string }>;
      workspaceId = workspaces[0]?.id ?? '';
      if (workspaceId) break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!workspaceId) {
    throw new Error('Default workspace not visible after registration');
  }

  const orgRes = await request.get(`${API_BASE}/v1/organizations/current`, { headers });
  if (!orgRes.ok()) {
    throw new Error(`organizations/current failed (${orgRes.status()}): ${await orgRes.text()}`);
  }
  const org = (await orgRes.json()) as { name: string; slug?: string };

  const sessionPayload: E2eSessionPayload = {
    userId: session.user.id,
    name: [session.user.firstName, session.user.lastName].filter(Boolean).join(' '),
    email: session.user.email,
    role: membershipRole(accessToken),
    orgId,
    orgName: org.name,
    orgSlug: org.slug,
    accessToken,
    refreshToken: session.refreshToken,
    demo: false,
  };

  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    CREDS_PATH,
    JSON.stringify({
      email,
      password,
      organizationId: orgId,
      accessToken,
      workspaceId,
    }),
    'utf8',
  );

  const context = await browser.newContext();
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: encodeSessionCookie(sessionPayload),
      url: WEB_BASE,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await context.storageState({ path: STORAGE_PATH });
  await context.close();
});
