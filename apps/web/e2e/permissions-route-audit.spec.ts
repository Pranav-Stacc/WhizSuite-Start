import { test, expect } from '@playwright/test';
import { Permissions } from '@agency-os/contracts';
import {
  CLIENT_ROLE_BASELINE,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  STAFF_ROUTE_GUARDS,
  loginWeb,
} from './permissions-helpers';

const ROUTES: { path: string; permission: string | null; memberWithClientRole: 'allow' | 'deny' }[] = [
  { path: '/dashboard', permission: null, memberWithClientRole: 'allow' },
  ...STAFF_ROUTE_GUARDS.map(({ path, permission }) => ({
    path,
    permission,
    memberWithClientRole: (CLIENT_ROLE_BASELINE.includes(permission) ? 'allow' : 'deny') as
      | 'allow'
      | 'deny',
  })),
  { path: '/settings', permission: null, memberWithClientRole: 'allow' },
];

test.describe('permission route audit (live)', () => {
  test('owner can open all staff modules', async ({ page }) => {
    test.skip(process.env.APP_DATA_MODE !== 'live', 'live only');
    await loginWeb(page, OWNER_EMAIL, OWNER_PASSWORD, page.request);
    for (const { path } of ROUTES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(page.url(), `owner blocked at ${path}`).toMatch(new RegExp(`${path.replace('/', '\\/')}(\\?|$)`));
    }
  });

  test('client custom role member: nav matches capabilities', async ({ page }) => {
    test.skip(process.env.APP_DATA_MODE !== 'live', 'live only');
    await loginWeb(page, MEMBER_EMAIL, MEMBER_PASSWORD, page.request);
    for (const { path, memberWithClientRole } of ROUTES) {
      await page.goto(path, { waitUntil: 'networkidle' });
      if (memberWithClientRole === 'allow') {
        await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(\\?|$)`));
      } else {
        await expect(page).toHaveURL(/\/dashboard(\?|$)/, { timeout: 15_000 });
      }
    }
  });
});
