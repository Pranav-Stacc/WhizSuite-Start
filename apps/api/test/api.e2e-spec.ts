import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { isE2eDbUnavailable } from './e2e-env';

const dbUnavailable = isE2eDbUnavailable();

describe('Agency OS API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let organizationId: string;
  let workspaceId: string;
  let membershipId: string;
  let clientId: string;
  let projectId: string;
  let taskId: string;
  let contentId: string;
  let leadId: string;
  let automationId: string;
  let integrationProviderId: string;
  let userId: string;
  const slug = `e2e-${Date.now()}`;
  const email = `e2e-${Date.now()}@test.agency`;
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

  const decodeJwt = (token: string) =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
      sub: string;
      membershipId?: string;
    };

  it('GET /api/health', async () => {
    if (skipIfNoDb()) return;
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('POST /api/v1/auth/register', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password,
        firstName: 'E2E',
        lastName: 'Tester',
        organizationName: 'E2E Agency',
        organizationSlug: slug,
      })
      .expect(201);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    organizationId = res.body.organization.id;
    userId = res.body.user.id;
    membershipId = decodeJwt(accessToken).membershipId ?? '';
    expect(accessToken).toBeDefined();
    expect(organizationId).toBeDefined();
  });

  it('POST /api/v1/auth/login', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    expect(res.body.organizationId).toBe(organizationId);
  });

  it('POST /api/v1/auth/refresh', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
    expect(accessToken).toBeDefined();
  });

  it('GET /api/v1/access/capabilities', async () => {
    if (skipIfNoDb()) return;
    await request(app.getHttpServer())
      .get('/api/v1/access/capabilities')
      .set(auth())
      .expect(200);
  });

  it('GET /api/v1/organizations/current', async () => {
    if (skipIfNoDb()) return;
    const res = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set(auth())
      .expect(200);
    expect(res.body.id).toBe(organizationId);
  });

  it('GET /api/v1/organizations/:orgId', async () => {
    if (skipIfNoDb()) return;
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set(auth())
      .expect(200);
  });

  it('GET/POST workspaces', async () => {
    if (skipIfNoDb()) return;
    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/workspaces`)
      .set(auth())
      .expect(200);
    workspaceId = list.body[0]?.id;
    expect(workspaceId).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/workspaces`)
      .set(auth())
      .send({ name: 'Client Work', slug: 'client-work' })
      .expect(201);
  });

  it('POST departments and teams', async () => {
    if (skipIfNoDb()) return;
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/departments`)
      .set(auth())
      .send({ name: 'Creative' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/teams`)
      .set(auth())
      .send({ name: 'Design Squad', workspaceId })
      .expect(201);
  });

  it('clients CRUD flow', async () => {
    if (skipIfNoDb()) return;
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/clients`)
      .set(auth())
      .send({ workspaceId, displayName: 'Acme Corp' })
      .expect(201);
    clientId = created.body.id;

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/clients`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/clients/${clientId}`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/clients/${clientId}/brand-kit`)
      .set(auth())
      .send({ colors: { primary: '#000000' } })
      .expect(200);
  });

  it('leads CRUD flow', async () => {
    if (skipIfNoDb()) return;
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/leads`)
      .set(auth())
      .send({ companyName: 'Prospect Inc' })
      .expect(201);
    leadId = created.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/leads/${leadId}`)
      .set(auth())
      .send({ brandName: 'Prospect Brand' })
      .expect(200);
  });

  it('projects and tasks flow', async () => {
    if (skipIfNoDb()) return;
    const project = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/projects`)
      .set(auth())
      .send({ workspaceId, clientId, name: 'Q1 Campaign' })
      .expect(201);
    projectId = project.body.id;

    const task = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/tasks`)
      .set(auth())
      .send({ projectId, title: 'Design carousel' })
      .expect(201);
    taskId = task.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/tasks/${taskId}/transition`)
      .set(auth())
      .send({ toStatus: 'IN_PROGRESS' })
      .expect(201);
  });

  it('workflows flow', async () => {
    if (skipIfNoDb()) return;
    const version = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/workflows`)
      .set(auth())
      .send({
        entityType: 'TASK',
        name: 'Task Workflow',
        states: [{ key: 'TODO', label: 'To Do', isInitial: true }],
        transitions: [],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/workflows/versions/${version.body.id}`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/workflows/versions/${version.body.id}/publish`)
      .set(auth())
      .expect(201);
  });

  it('content and social endpoints', async () => {
    if (skipIfNoDb()) return;
    const content = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/content`)
      .set(auth())
      .send({
        clientId,
        title: 'Launch Post',
        contentType: 'POST',
        caption: 'Hello world',
      })
      .expect(201);
    contentId = content.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/content/${contentId}/transition`)
      .set(auth())
      .send({ toStatus: 'IN_REVIEW' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/campaigns`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/social-accounts`)
      .set(auth())
      .expect(200);
  });

  it('approvals flow', async () => {
    if (skipIfNoDb()) return;
    const approval = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/approvals`)
      .set(auth())
      .send({
        subjectType: 'CONTENT',
        subjectId: contentId,
        subjectVersion: '1',
        steps: [{ name: 'Client Review', order: 1, rule: 'ANY', approverSpec: { type: 'owner' } }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/approvals/${approval.body.id}/act`)
      .set(auth())
      .send({ action: 'APPROVED', comment: 'Looks good' })
      .expect(201);
  });

  it('media, finance, time, feedback, inbox', async () => {
    if (skipIfNoDb()) return;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/media/assets/presign`)
      .set(auth())
      .send({ filename: 'hero.jpg', mimeType: 'image/jpeg', sizeBytes: 1024 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/media/assets`)
      .set(auth())
      .send({ name: 'logo.png', mimeType: 'image/png', sizeBytes: 2048 })
      .expect(201);

    const invoice = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invoices`)
      .set(auth())
      .send({ clientId, number: `INV-${Date.now()}` })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/invoices/${invoice.body.id}`)
      .set(auth())
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/api/v1/organizations/current')
      .set(auth())
      .expect(200);
    membershipId = me.body.membershipId ?? me.body.memberships?.[0]?.id;

    if (membershipId) {
      const entry = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/time/entries`)
        .set(auth())
        .send({
          membershipId,
          minutes: 60,
          startedAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}/time/entries/${entry.body.id}`)
        .set(auth())
        .send({ minutes: 90 })
        .expect(200);
    }

    const thread = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/feedback/threads`)
      .set(auth())
      .send({
        subjectType: 'CONTENT',
        subjectId: contentId,
        subjectVersion: '1',
        createdById: userId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/feedback/threads/${thread.body.id}`)
      .set(auth())
      .send({ status: 'OPEN' })
      .expect(200);

    const conv = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/inbox/conversations`)
      .set(auth())
      .send({ clientId, type: 'DM' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/inbox/conversations/${conv.body.id}`)
      .set(auth())
      .send({ status: 'OPEN' })
      .expect(200);
  });

  it('automations, reports, custom fields, templates, calendar, activity, analytics', async () => {
    if (skipIfNoDb()) return;

    const automation = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/automations`)
      .set(auth())
      .send({ name: 'Notify on approval' })
      .expect(201);
    automationId = automation.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/automations/${automationId}/publish`)
      .set(auth())
      .send({
        trigger: { type: 'approval.completed' },
        actions: { type: 'notify', channel: 'in_app' },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/automations/${automationId}/run`)
      .set(auth())
      .send({ source: 'e2e' })
      .expect(201);

    const report = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/reports`)
      .set(auth())
      .send({
        clientId,
        title: 'Monthly Report',
        periodStart: new Date('2026-01-01').toISOString(),
        periodEnd: new Date('2026-01-31').toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/reports/${report.body.id}`)
      .set(auth())
      .send({ title: 'January Report' })
      .expect(200);

    const field = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/custom-fields`)
      .set(auth())
      .send({
        entityType: 'CLIENT',
        key: 'tier',
        label: 'Client Tier',
        type: 'SELECT',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/custom-fields/${field.body.id}`)
      .set(auth())
      .send({ label: 'Tier' })
      .expect(200);

    const template = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/templates`)
      .set(auth())
      .send({
        type: 'CONTENT',
        name: 'Carousel Template',
        definition: { slides: 5 },
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/templates/${template.body.id}`)
      .set(auth())
      .send({ name: 'Updated Template' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/calendar/items`)
      .set(auth())
      .send({
        sourceType: 'CONTENT',
        sourceId: contentId,
        title: 'Publish day',
        startsAt: new Date().toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/activity`)
      .set(auth())
      .send({
        verb: 'created',
        entityType: 'CLIENT',
        entityId: clientId,
        summary: 'Client created in E2E test',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/analytics/metrics`)
      .set(auth())
      .send({
        metricKey: 'impressions',
        value: 1000,
        recordedAt: new Date().toISOString(),
      })
      .expect(201);
  });

  it('integrations, knowledge, invitations, notifications, billing, audit, search, ai, realtime', async () => {
    if (skipIfNoDb()) return;

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/integrations/connections`)
      .set(auth())
      .expect(200);

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const provider = await prisma.integrationProvider.findFirst({ where: { key: 'meta' } });
    integrationProviderId = provider?.id ?? '';
    await prisma.$disconnect();

    if (integrationProviderId) {
      const conn = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/integrations/connections`)
        .set(auth())
        .send({ providerId: integrationProviderId, clientId })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}/integrations/connections/${conn.body.id}`)
        .set(auth())
        .send({ status: 'CONNECTED' })
        .expect(200);
    }

    const space = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/knowledge/spaces`)
      .set(auth())
      .send({ name: 'Playbooks' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/knowledge/spaces/${space.body.id}`)
      .set(auth())
      .send({ name: 'Agency Playbooks' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/invitations`)
      .set(auth())
      .send({
        email: `invite-${Date.now()}@test.agency`,
        membershipType: 'MEMBER',
        roleIds: [],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/notifications`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/billing/subscription`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/search?q=Acme`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/ai/caption')
      .set(auth())
      .send({ topic: 'Product launch', platform: 'instagram' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/ai/hashtags')
      .set(auth())
      .send({ topic: 'launch' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/realtime/status')
      .set(auth())
      .expect(200);
  });

  it('POST /api/v1/auth/logout', async () => {
    if (skipIfNoDb()) return;
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(201);
  });
});
