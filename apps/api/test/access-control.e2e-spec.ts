import type { INestApplication } from '@nestjs/common';
import { moduleKeyForPermission } from '@agency-os/contracts';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { isE2eDbUnavailable } from './e2e-env';

const dbUnavailable = isE2eDbUnavailable();

function tokenFromShareUrl(shareUrl: string): string {
  const url = new URL(shareUrl);
  const token = url.searchParams.get('token');
  if (!token) throw new Error(`Missing token in share URL: ${shareUrl}`);
  return token;
}

describe('Access control & portal (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let organizationId: string;
  let workspaceId: string;
  let clientId: string;
  let customRoleId: string;
  const slug = `e2e-ac-${Date.now()}`;
  const ownerEmail = `e2e-ac-owner-${Date.now()}@test.agency`;
  const inviteEmail = `e2e-ac-invite-${Date.now()}@test.agency`;
  const portalEmail = `e2e-ac-portal-${Date.now()}@test.agency`;
  const password = 'SecurePass123!@#';

  beforeAll(async () => {
    if (dbUnavailable) return;
    app = await createTestApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = () => ({
    Authorization: `Bearer ${accessToken}`,
    'x-organization-id': organizationId,
  });

  const skipIfNoDb = () => {
    if (dbUnavailable) {
      console.warn('Skipping — database not available');
      return true;
    }
    return false;
  };

  it('POST /api/v1/auth/register', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        firstName: 'E2E',
        lastName: 'Access',
        organizationName: 'E2E Access Agency',
        organizationSlug: slug,
      })
      .expect(201);

    accessToken = res.body.accessToken;
    organizationId = res.body.organization.id;
    expect(accessToken).toBeDefined();
  });

  it('GET /api/v1/permissions aligns catalog rows with module keys', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set(auth())
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const modules = new Set<string>();
    for (const row of res.body as Array<{ key: string; category: string | null }>) {
      const module = moduleKeyForPermission(row.key);
      modules.add(module);
      expect(row.category ?? module).toBe(module);
    }
    expect(modules.has('content')).toBe(true);
    expect(modules.has('members')).toBe(true);
  });

  it('POST custom role and list roles', async () => {
    if (skipIfNoDb()) return;
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/roles`)
      .set(auth())
      .send({
        name: 'E2E Content Viewer',
        description: 'Read-only content for e2e',
        kind: 'ACCESS',
        permissionKeys: ['content.view', 'tasks.view'],
        defaultScopeTypes: ['ORGANIZATION'],
        permissionScopes: [
          { key: 'content.view', scopeTypes: ['ORGANIZATION'] },
          { key: 'tasks.view', scopeTypes: ['ORGANIZATION'] },
        ],
      })
      .expect(201);
    customRoleId = created.body.id;
    expect(customRoleId).toBeDefined();

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/roles`)
      .set(auth())
      .expect(200);
    const names = (list.body as Array<{ name: string }>).map((r) => r.name);
    expect(names).toContain('E2E Content Viewer');
  });

  it('POST department', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/departments`)
      .set(auth())
      .send({ name: 'E2E Creative' })
      .expect(201);
    expect(res.body.name).toBe('E2E Creative');

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/departments`)
      .set(auth())
      .expect(200);
    expect((list.body as Array<{ name: string }>).some((d) => d.name === 'E2E Creative')).toBe(true);
  });

  it('POST member invitation and redeem', async () => {
    if (skipIfNoDb()) return;
    const invited = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set(auth())
      .send({
        email: inviteEmail,
        membershipType: 'MEMBER',
        roleIds: customRoleId ? [customRoleId] : [],
      })
      .expect(201);

    expect(invited.body.acceptUrl).toMatch(/token=/);
    const token = tokenFromShareUrl(invited.body.acceptUrl as string);

    const preview = await request(app.getHttpServer())
      .get('/api/v1/invitations/preview')
      .query({ token })
      .expect(200);
    expect(preview.body.email).toBe(inviteEmail.toLowerCase());

    const redeemed = await request(app.getHttpServer())
      .post('/api/v1/invitations/redeem')
      .send({
        token,
        password: 'InvitePass123!@#',
        firstName: 'Invited',
        lastName: 'Member',
      })
      .expect(201);
    expect(redeemed.body.accessToken).toBeDefined();
    expect(redeemed.body.organizationId ?? redeemed.body.organization?.id).toBe(organizationId);

    const inviteToken = redeemed.body.accessToken as string;
    const orgCurrent = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set({
        Authorization: `Bearer ${inviteToken}`,
        'x-organization-id': organizationId,
      })
      .expect(200);
    expect(orgCurrent.body.id).toBe(organizationId);
    expect(orgCurrent.body.name).toBeDefined();
  });

  it('portal access link preview and redeem', async () => {
    if (skipIfNoDb()) return;
    const workspaces = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/workspaces`)
      .set(auth())
      .expect(200);
    workspaceId = workspaces.body[0]?.id;
    expect(workspaceId).toBeDefined();

    const client = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/clients`)
      .set(auth())
      .send({ workspaceId, displayName: 'E2E Portal Client' })
      .expect(201);
    clientId = client.body.id;

    const link = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/portal-access-links`)
      .set(auth())
      .send({ clientId, accessMode: 'TEMPORARY' })
      .expect(201);

    const portalToken = tokenFromShareUrl(link.body.shareUrl as string);

    const preview = await request(app.getHttpServer())
      .get('/api/v1/portal-access/preview')
      .query({ token: portalToken })
      .expect(200);
    expect(preview.body.clientName).toBe('E2E Portal Client');
    expect(preview.body.passwordRequired).toBe(false);

    const redeemed = await request(app.getHttpServer())
      .post('/api/v1/portal-access/redeem')
      .send({
        token: portalToken,
        email: portalEmail,
        firstName: 'Portal',
        lastName: 'User',
      })
      .expect(201);
    expect(redeemed.body.accessToken).toBeDefined();
    expect(redeemed.body.organizationId ?? redeemed.body.organization?.id).toBe(organizationId);
  });

  it('rejects cross-tenant client reads (tenant mismatch)', async () => {
    if (skipIfNoDb()) return;
    expect(clientId).toBeDefined();

    const otherSlug = `e2e-ac-other-${Date.now()}`;
    const other = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `e2e-ac-other-${Date.now()}@test.agency`,
        password,
        firstName: 'Other',
        lastName: 'Org',
        organizationName: 'Other Agency',
        organizationSlug: otherSlug,
      })
      .expect(201);

    const otherToken = other.body.accessToken as string;
    const otherOrgId = other.body.organization.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/clients/${clientId}`)
      .set({
        Authorization: `Bearer ${otherToken}`,
        'x-organization-id': otherOrgId,
      })
      .expect((res) => {
        expect([403, 404]).toContain(res.status);
      });
  });
});
