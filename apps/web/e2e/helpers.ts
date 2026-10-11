import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_HOST = process.env.API_HOST ?? '127.0.0.1';
const API_PORT = process.env.API_PORT ?? '3001';
export const API_BASE = process.env.API_BASE_URL ?? `http://${API_HOST}:${API_PORT}/api`;

export interface E2eCreds {
  email: string;
  password: string;
  organizationId: string;
  accessToken: string;
  workspaceId: string;
}

const CREDS_PATH = path.join(__dirname, '.auth', 'credentials.json');

export async function loadCreds(): Promise<E2eCreds> {
  const raw = await readFile(CREDS_PATH, 'utf8');
  return JSON.parse(raw) as E2eCreds;
}

export function authHeaders(creds: E2eCreds): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.accessToken}`,
    'x-organization-id': creds.organizationId,
    'content-type': 'application/json',
  };
}

/** Uses Playwright storage state from auth.setup when present. */
export async function ensureOwnerSession(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForURL(/\/(dashboard|portal)/, { timeout: 30_000 });
  if (page.url().includes('/login')) {
    throw new Error('Owner session missing — re-run auth setup (e2e/auth.setup.ts)');
  }
}

export async function login(page: Page, creds: Pick<E2eCreds, 'email' | 'password'>): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  const signIn = page.getByRole('button', { name: /sign in/i });
  await signIn.waitFor({ state: 'visible' });
  await expect(signIn).toBeEnabled({ timeout: 15_000 });
  await Promise.all([page.waitForURL(/\/(dashboard|portal)/, { timeout: 60_000 }), signIn.click()]);
}

/** Fresh browser context (no saved cookies). */
export const emptyStorageState = { cookies: [] as [], origins: [] as [] };

export function isPortalAppUrl(url: string): boolean {
  const path = new URL(url).pathname.replace(/\/$/, '') || '/';
  return path === '/portal' || path.startsWith('/portal/');
}

export async function waitForPortalApp(page: Page): Promise<void> {
  await page.waitForURL((url) => isPortalAppUrl(url.toString()), { timeout: 30_000 });
}

export function tokenFromInvitationResponse(body: {
  token?: string;
  acceptUrl?: string;
  shareUrl?: string;
}): string {
  if (body.token) return body.token;
  const link = body.acceptUrl ?? body.shareUrl;
  if (!link) throw new Error('No invitation link in API response');
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error(`Missing token in URL: ${link}`);
  return token;
}

export function tokenFromUrl(shareUrl: string): string {
  const token = new URL(shareUrl).searchParams.get('token');
  if (!token) throw new Error(`Missing token in URL: ${shareUrl}`);
  return token;
}

export async function createPortalAccessLink(
  request: APIRequestContext,
  creds: E2eCreds,
  clientId: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/v1/organizations/${creds.organizationId}/portal-access-links`, {
    headers: authHeaders(creds),
    data: { clientId, accessMode: 'TEMPORARY' },
  });
  if (!res.ok()) {
    throw new Error(`portal-access-links failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { shareUrl: string };
  return tokenFromUrl(body.shareUrl);
}

export async function resolveWorkspaceId(request: APIRequestContext, creds: E2eCreds): Promise<string> {
  if (creds.workspaceId) return creds.workspaceId;
  const res = await request.get(`${API_BASE}/v1/organizations/${creds.organizationId}/workspaces`, {
    headers: authHeaders(creds),
  });
  if (!res.ok()) {
    throw new Error(`workspaces list failed (${res.status()}): ${await res.text()}`);
  }
  const workspaces = (await res.json()) as Array<{ id: string }>;
  const workspaceId = workspaces[0]?.id;
  if (!workspaceId) throw new Error('No workspace found for e2e org');
  return workspaceId;
}

export async function ensurePortalClient(request: APIRequestContext, creds: E2eCreds): Promise<string> {
  const workspaceId = await resolveWorkspaceId(request, creds);
  const res = await request.post(`${API_BASE}/v1/organizations/${creds.organizationId}/clients`, {
    headers: authHeaders(creds),
    data: { workspaceId, displayName: `E2E Portal ${Date.now()}` },
  });
  if (!res.ok()) {
    throw new Error(`create client failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}
