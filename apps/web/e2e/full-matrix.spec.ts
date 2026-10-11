import { expect, test } from '@playwright/test';
import {
  API_BASE,
  authHeaders,
  createPortalAccessLink,
  ensureOwnerSession,
  ensurePortalClient,
  emptyStorageState,
  isPortalAppUrl,
  loadCreds,
  login,
  tokenFromInvitationResponse,
  waitForPortalApp,
} from './helpers';

/** Staff routes visited without dynamic IDs (owner smoke). */
const STAFF_ROUTES = [
  '/dashboard',
  '/tasks',
  '/projects',
  '/calendar',
  '/chat',
  '/time',
  '/content',
  '/media',
  '/approvals',
  '/clients',
  '/leads',
  '/automations',
  '/workflows',
  '/integrations',
  '/invoices',
  '/reports',
  '/team',
  '/departments',
  '/roles',
  '/knowledge',
  '/billing',
  '/audit',
  '/settings',
  '/notifications',
  '/agent',
] as const;

const PORTAL_ROUTES = ['/portal', '/portal/approvals', '/portal/messages', '/portal/files', '/portal/invoices', '/portal/reports'] as const;

async function assertHealthyPage(page: import('@playwright/test').Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  await expect(page.getByText(/application error/i)).toHaveCount(0);
  const url = page.url();
  expect(url).not.toContain('/auth/expired');
  if (url.includes('/login')) {
    throw new Error(`Unexpected login redirect at ${path}`);
  }
  if (path.startsWith('/portal') && !isPortalAppUrl(url)) {
    throw new Error(`Expected portal app URL at ${path}, got ${url}`);
  }
}

test.describe('Full matrix (live)', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop crawl');
  });

  test('owner: all staff routes load without error boundary', async ({ page }) => {
    await ensureOwnerSession(page);

    for (const route of STAFF_ROUTES) {
      await assertHealthyPage(page, route);
    }
  });

  test('owner: invite member flow', async ({ page }) => {
    await ensureOwnerSession(page);
    const email = `e2e-matrix-${Date.now()}@test.agency`;
    await page.goto('/team');
    await page.getByRole('button', { name: /invite member/i }).click();
    const inviteDialog = page.getByRole('dialog', { name: /invite a team member/i });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByLabel(/work email/i).fill(email);
    await inviteDialog.getByRole('button', { name: /send invite/i }).click();
    await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test.describe('portal (unauthenticated)', () => {
    test.use({ storageState: emptyStorageState });

    test('portal access redeems (API link)', async ({ page, request }) => {
      const creds = await loadCreds();
      const clientId = await ensurePortalClient(request, creds);
      const token = await createPortalAccessLink(request, creds, clientId);
      const portalEmail = `e2e-portal-matrix-${Date.now()}@test.agency`;

      await page.goto(`/portal-access?token=${token}`);
      await page.getByLabel(/work email/i).fill(portalEmail);
      await page.getByLabel(/first name/i).fill('Portal');
      await page.getByRole('button', { name: /continue to portal/i }).click();
      await waitForPortalApp(page);

      for (const route of PORTAL_ROUTES) {
        await assertHealthyPage(page, route);
      }
    });

    test('Fake Client 1 portal link opens when present', async ({ page, request }) => {
      const creds = await loadCreds();
      const list = await request.get(`${API_BASE}/v1/organizations/${creds.organizationId}/clients`, {
        headers: authHeaders(creds),
      });
      expect(list.ok()).toBeTruthy();
      const clients = (await list.json()) as Array<{ id: string; displayName: string }>;
      const fake = clients.find((c) => /fake client 1/i.test(c.displayName));
      test.skip(!fake, 'Fake Client 1 not in workspace');

      const token = await createPortalAccessLink(request, creds, fake!.id);
      const portalEmail = `e2e-fake-client-${Date.now()}@test.agency`;

      await page.goto(`/portal-access?token=${token}`);
      await page.getByLabel(/work email/i).fill(portalEmail);
      await page.getByLabel(/first name/i).fill('Fake');
      await page.getByRole('button', { name: /continue to portal/i }).click();
      await waitForPortalApp(page);
      await assertHealthyPage(page, '/portal');
    });
  });

  test.describe('restricted member', () => {
    test.use({ storageState: emptyStorageState });

    test('pages without permission redirect or stay safe', async ({ page, request }) => {
      const creds = await loadCreds();
      const roleName = `E2E Restricted ${Date.now()}`;
      const createRole = await request.post(`${API_BASE}/v1/organizations/${creds.organizationId}/roles`, {
        headers: authHeaders(creds),
        data: {
          name: roleName,
          description: 'content only',
          kind: 'ACCESS',
          defaultScopeTypes: ['ORGANIZATION'],
          permissionKeys: ['content.view', 'clients.view'],
        },
      });
      if (!createRole.ok()) {
        throw new Error(`create role failed (${createRole.status()}): ${await createRole.text()}`);
      }
      const role = (await createRole.json()) as { id: string };

      const inviteEmail = `e2e-restricted-${Date.now()}@test.agency`;
      const invite = await request.post(`${API_BASE}/v1/organizations/${creds.organizationId}/invitations`, {
        headers: authHeaders(creds),
        data: { email: inviteEmail, membershipType: 'MEMBER', roleIds: [role.id] },
      });
      if (!invite.ok()) {
        throw new Error(`invite failed (${invite.status()}): ${await invite.text()}`);
      }
      const invBody = (await invite.json()) as { acceptUrl?: string; token?: string };
      const token = tokenFromInvitationResponse(invBody);

      const redeem = await request.post(`${API_BASE}/v1/invitations/redeem`, {
        data: {
          token,
          password: 'RestrictedPass123!@#',
          firstName: 'Restricted',
          lastName: 'User',
        },
      });
      if (!redeem.ok()) {
        throw new Error(`redeem failed (${redeem.status()}): ${await redeem.text()}`);
      }

      await login(page, { email: inviteEmail, password: 'RestrictedPass123!@#' });

      await assertHealthyPage(page, '/content');
      await assertHealthyPage(page, '/clients');

      await page.goto('/roles');
      await page.waitForURL(/\/(dashboard|roles)/, { timeout: 15_000 });
      expect(page.url()).not.toMatch(/\/roles$/);
    });
  });
});
