import { expect, test } from '@playwright/test';
import {
  createPortalAccessLink,
  ensurePortalClient,
  ensureOwnerSession,
  emptyStorageState,
  isPortalAppUrl,
  loadCreds,
  waitForPortalApp,
} from './helpers';

const MATRIX_MODULES = ['content', 'clients', 'members', 'calendar', 'tasks', 'invoices'];

function moduleHeading(module: string): string {
  const text = module.replace(/[_-]+/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

test.describe('Access control (web)', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop-only flows');
  });

  test('roles dialog shows permission matrix grouped by module', async ({ page }) => {
    await ensureOwnerSession(page);

    await page.goto('/roles');
    await expect(page.getByRole('heading', { name: /roles/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /create role/i }).click();
    await expect(page.getByRole('dialog', { name: /new role/i })).toBeVisible();

    for (const module of MATRIX_MODULES) {
      await expect(page.getByRole('heading', { name: moduleHeading(module), exact: true })).toBeVisible();
    }
  });

  test('owner can add a department', async ({ page }) => {
    await ensureOwnerSession(page);

    const deptName = `E2E Dept ${Date.now()}`;
    await page.goto('/departments');
    await page.getByRole('button', { name: /add department/i }).click();
    const deptDialog = page.getByRole('dialog', { name: /new department/i });
    await expect(deptDialog).toBeVisible();
    await deptDialog.getByLabel(/department name/i).fill(deptName);
    await deptDialog.getByRole('button', { name: /create department/i }).click();

    await expect(page.getByText(deptName)).toBeVisible();
  });

  test('owner can invite a team member', async ({ page }) => {
    await ensureOwnerSession(page);

    const email = `e2e-web-invite-${Date.now()}@test.agency`;
    await page.goto('/team');
    await page.getByRole('button', { name: /invite member/i }).click();
    const inviteDialog = page.getByRole('dialog', { name: /invite a team member/i });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByLabel(/work email/i).fill(email);
    await inviteDialog.getByRole('button', { name: /send invite/i }).click();

    await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 15_000 });
  });

  test.describe('portal (unauthenticated)', () => {
    test.use({ storageState: emptyStorageState });

    test('portal access link redeems into client portal', async ({ page, request }) => {
    const creds = await loadCreds();
    const clientId = await ensurePortalClient(request, creds);
    const token = await createPortalAccessLink(request, creds, clientId);
    const portalEmail = `e2e-portal-${Date.now()}@test.agency`;

    await page.goto(`/portal-access?token=${token}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByLabel(/work email/i).fill(portalEmail);
    await page.getByLabel(/first name/i).fill('Portal');
    await page.getByRole('button', { name: /continue to portal/i }).click();

    await waitForPortalApp(page);
    await expect(page).toHaveURL((url) => isPortalAppUrl(url.toString()));
    });
  });
});
