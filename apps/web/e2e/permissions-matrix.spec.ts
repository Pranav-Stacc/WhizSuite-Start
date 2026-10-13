import { test, expect } from '@playwright/test';
import { Permissions, ALL_PERMISSIONS, type Permission } from '@agency-os/contracts';
import {
  CLIENT_ROLE_BASELINE,
  CLIENT_ROLE_NAME,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  OWNER_EMAIL,
  OWNER_PASSWORD,
  STAFF_ROUTE_GUARDS,
  apiLogin,
  expectRouteAccess,
  fetchCapabilities,
  findRoleId,
  loginWeb,
  updateRolePermissions,
} from './permissions-helpers';

const PROBE_DENY_PATH = '/clients';
const PROBE_DENY_PERMISSION = Permissions.CLIENTS_VIEW;

test.describe.configure({ mode: 'serial', timeout: 600_000 });

test.describe('permission matrix (owner API → member UI)', () => {
  test.skip(process.env.APP_DATA_MODE !== 'live', 'live only');

  let roleId = '';

  test.beforeAll(async ({ request }) => {
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    roleId = await findRoleId(request, owner, CLIENT_ROLE_NAME);
  });

  test.afterAll(async ({ request }) => {
    if (!roleId) return;
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    await updateRolePermissions(request, owner, roleId, CLIENT_ROLE_BASELINE);
  });

  test('each staff route permission: capabilities + page guard', async ({ page, request }) => {
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    const failures: string[] = [];

    for (const { path, permission } of STAFF_ROUTE_GUARDS) {
      await updateRolePermissions(request, owner, roleId, [permission]);
      const member = await apiLogin(request, MEMBER_EMAIL, MEMBER_PASSWORD);
      const caps = new Set(await fetchCapabilities(request, member));

      if (!caps.has(permission)) {
        failures.push(`${permission}: missing from /access/capabilities`);
      }
      if (permission !== PROBE_DENY_PERMISSION && caps.has(PROBE_DENY_PERMISSION)) {
        failures.push(`${permission}: wrongly includes ${PROBE_DENY_PERMISSION} (companion leak)`);
      }

      await loginWeb(page, MEMBER_EMAIL, MEMBER_PASSWORD, request);
      try {
        await expectRouteAccess(page, path, true);
      } catch {
        failures.push(`${permission}: expected UI access to ${path}`);
      }
      try {
        if (permission !== PROBE_DENY_PERMISSION) {
          await expectRouteAccess(page, PROBE_DENY_PATH, false);
        }
      } catch {
        failures.push(`${permission}: ${PROBE_DENY_PATH} should redirect to dashboard`);
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });

  test('every catalog permission: explicit grant appears in capabilities', async ({ request }) => {
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    const missing: Permission[] = [];

    for (const permission of ALL_PERMISSIONS) {
      await updateRolePermissions(request, owner, roleId, [permission]);
      const member = await apiLogin(request, MEMBER_EMAIL, MEMBER_PASSWORD);
      const caps = await fetchCapabilities(request, member);
      if (!caps.includes(permission)) missing.push(permission);
      await new Promise((r) => setTimeout(r, 120));
    }

    expect(missing, `capabilities missing explicit keys: ${missing.join(', ')}`).toEqual([]);
  });

  test('content.view alone does not grant clients.view (API or UI)', async ({ page, request }) => {
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    await updateRolePermissions(request, owner, roleId, [Permissions.CONTENT_VIEW]);
    const member = await apiLogin(request, MEMBER_EMAIL, MEMBER_PASSWORD);
    const caps = await fetchCapabilities(request, member);
    expect(caps).toContain(Permissions.CONTENT_VIEW);
    expect(caps).not.toContain(Permissions.CLIENTS_VIEW);

    await loginWeb(page, MEMBER_EMAIL, MEMBER_PASSWORD, request);
    await expectRouteAccess(page, '/content', true);
    await expectRouteAccess(page, '/clients', false);
  });

  test('restore baseline: member matches full Client role routes', async ({ page, request }) => {
    const owner = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD);
    await updateRolePermissions(request, owner, roleId, CLIENT_ROLE_BASELINE);
    const member = await apiLogin(request, MEMBER_EMAIL, MEMBER_PASSWORD);
    const caps = new Set(await fetchCapabilities(request, member));
    expect(caps.has(Permissions.CLIENTS_VIEW)).toBe(false);

    await loginWeb(page, MEMBER_EMAIL, MEMBER_PASSWORD, request);
    for (const { path, permission } of STAFF_ROUTE_GUARDS) {
      const allowed = CLIENT_ROLE_BASELINE.includes(permission);
      await expectRouteAccess(page, path, allowed);
    }
  });
});
