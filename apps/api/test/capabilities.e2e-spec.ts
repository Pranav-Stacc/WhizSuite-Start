import './e2e-throttle-env';
import type { INestApplication } from '@nestjs/common';
import { CAPABILITY_CATALOG, Permissions } from '@agency-os/contracts';
import request from 'supertest';
import { createTestApp } from './create-test-app';
import { isE2eDbUnavailable } from './e2e-env';
import { PrismaService } from '../src/shared/database/prisma.service';
import { MediaService } from '../src/modules/media/application/services/media.service';
import { StorageService } from '../src/shared/storage/storage.service';

const dbUnavailable = isE2eDbUnavailable();
const CATALOG = new Map(CAPABILITY_CATALOG.map((tool) => [tool.id, tool]));

type Json = Record<string, unknown>;

/** Mutable ids populated as the scenario runs; typed so Prisma/fetch calls stay strict. */
interface Ctx {
  orgId: string;
  userId: string;
  runId: string;
  secondUserId: string;
  workspaceId: string;
  roleId: string;
  invitationId: string;
  clientId: string;
  leadId: string;
  throwawayLeadId: string;
  projectId: string;
  taskId: string;
  timeEntryId: string;
  contentId: string;
  variantId: string;
  throwawayContentId: string;
  approvalId: string;
  threadId: string;
  calendarItemId: string;
  roomId: string;
  messageId: string;
  folderId: string;
  assetId: string;
  mediaUploadUrl: string;
  invoiceId: string;
  contractId: string;
  automationId: string;
  articleId: string;
  workflowId: string;
  workflowVersionId: string;
  providerId: string;
  connectionId: string;
  reportId: string;
  notificationId: string;
  agentDefinitionId: string;
  throwawayTaskId: string;
  throwawayRoleId: string;
}

interface Step {
  tool: string;
  input: (ctx: Ctx) => Json;
  /** Runs before the step (seed rows, create throwaway entities to delete). */
  prepare?: (ctx: Ctx) => Promise<void>;
  /** Store ids from the output for later steps. */
  save?: (output: unknown, ctx: Ctx) => void;
  /** Extra assertions on the output (read-after-write checks). */
  check?: (output: unknown, ctx: Ctx) => void;
}

const stamp = Date.now();
const future = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();
const day = (days: number) => future(days).slice(0, 10);

/** Finds an id in a capability output: `{id}`, `{item:{id}}`, `{room:{id}}`, etc. */
function idOf(output: unknown, key = 'id'): string {
  if (!output || typeof output !== 'object') return '';
  const record = output as Json;
  if (typeof record[key] === 'string') return record[key];
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = (value as Json)[key];
      if (typeof nested === 'string') return nested;
    }
  }
  return '';
}

function listOf(output: unknown): Json[] {
  if (Array.isArray(output)) return output as Json[];
  if (output && typeof output === 'object') {
    for (const value of Object.values(output as Json)) {
      if (Array.isArray(value)) return value as Json[];
    }
  }
  return [];
}

const save =
  (key: keyof Ctx, field = 'id') =>
  (output: unknown, ctx: Ctx) => {
    const id = idOf(output, field);
    expect(id).toBeTruthy();
    ctx[key] = id;
  };

const expectListed = (key: keyof Ctx) => (output: unknown, ctx: Ctx) => {
  expect(listOf(output).some((row) => row.id === ctx[key])).toBe(true);
};

describe('All 140 capabilities — live read/write/confirm (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken = '';
  const ctx = {} as Ctx;

  beforeAll(async () => {
    if (dbUnavailable) return;
    app = await createTestApp();
    prisma = app.get(PrismaService);
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = () => ({
    Authorization: `Bearer ${accessToken}`,
    'x-organization-id': ctx.orgId,
  });

  async function mcpCall(toolId: string, input: Json) {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${ctx.orgId}/mcp`)
      .set(auth())
      .send({
        jsonrpc: '2.0',
        id: toolId,
        method: 'tools/call',
        params: { name: toolId, arguments: input, runId: ctx.runId },
      });
    const text = res.body?.result?.content?.[0]?.text as string | undefined;
    const result = text ? (JSON.parse(text) as Json) : (res.body as Json);
    return { http: res.status, result };
  }

  /** Calls a tool the way the agent does; confirms WRITE_HIGH tools and returns the output. */
  async function execute(toolId: string, input: Json): Promise<unknown> {
    const first = await mcpCall(toolId, input);
    let result = first.result;

    const fail = (expected: string) =>
      new Error(
        `${toolId}: expected ${expected}, got ${JSON.stringify(result).slice(0, 600)}`,
      );

    if (CATALOG.get(toolId)?.requiresConfirmation) {
      if (result.status !== 'pending_confirmation')
        throw fail('pending_confirmation');
      const pendingActionId = result.pendingActionId as string;

      const confirm = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${ctx.orgId}/capabilities/execute`)
        .set(auth())
        .send({ toolId, input, pendingActionId });
      result = confirm.body as Json;
    }

    if (result.status !== 'ok') throw fail('ok');
    return result.output;
  }

  const steps: Step[] = [
    // Organization, workspace and structure
    {
      tool: 'org.get',
      input: () => ({}),
      check: (out, c) => expect(idOf(out)).toBe(c.orgId),
    },
    {
      tool: 'org.theme.update',
      input: () => ({ primary: '#2563eb', accent: '#f97316' }),
    },
    { tool: 'billing.plans.list', input: () => ({}) },
    { tool: 'billing.subscription.get', input: () => ({}) },
    {
      tool: 'workspaces.create',
      input: () => ({
        name: 'E2E Workspace',
        slug: `e2e-ws-${stamp}`,
        timezone: 'Asia/Kolkata',
      }),
      save: save('workspaceId'),
    },
    {
      tool: 'workspaces.list',
      input: () => ({}),
      check: expectListed('workspaceId'),
    },
    {
      tool: 'departments.create',
      input: () => ({ name: `Creative ${stamp}` }),
    },
    { tool: 'departments.list', input: () => ({}) },
    {
      tool: 'teams.create',
      input: (c) => ({ name: 'Design squad', workspaceId: c.workspaceId }),
    },

    // Members, roles, invitations
    { tool: 'members.list', input: () => ({}) },
    {
      tool: 'roles.create',
      input: () => ({
        name: `E2E Editor ${stamp}`,
        permissions: [Permissions.CLIENTS_VIEW],
      }),
      save: save('roleId'),
    },
    { tool: 'roles.list', input: () => ({}), check: expectListed('roleId') },
    {
      tool: 'roles.update',
      input: (c) => ({ roleId: c.roleId, name: `E2E Editor v2 ${stamp}` }),
    },
    {
      tool: 'members.assign_roles',
      input: (c) => ({ userId: c.secondUserId, roleIds: [c.roleId] }),
    },
    {
      tool: 'members.invite',
      input: () => ({
        email: `invitee-${stamp}@test.agency`,
        membershipType: 'MEMBER',
      }),
      save: save('invitationId', 'invitationId'),
    },
    {
      tool: 'invitations.revoke',
      input: (c) => ({ invitationId: c.invitationId }),
    },

    // Clients
    {
      tool: 'clients.create',
      input: (c) => ({
        name: 'Acme Live',
        workspaceId: c.workspaceId,
        industry: 'Retail',
      }),
      save: save('clientId'),
    },
    {
      tool: 'clients.list',
      input: () => ({}),
      check: expectListed('clientId'),
    },
    {
      tool: 'clients.update',
      input: (c) => ({
        clientId: c.clientId,
        status: 'ACTIVE',
        website: 'https://acme.example',
      }),
    },
    {
      tool: 'clients.get',
      input: (c) => ({ clientId: c.clientId }),
      check: (out) => expect(out).toMatchObject({ displayName: 'Acme Live' }),
    },
    {
      tool: 'clients.brand_kit.update',
      input: (c) => ({
        clientId: c.clientId,
        voice: 'Friendly and bold',
        pillars: ['Quality', 'Speed'],
        bannedWords: ['cheap'],
        primaryColor: '#111827',
      }),
    },

    // CRM
    {
      tool: 'leads.create',
      input: () => ({
        company: 'Globex Pipeline',
        contactName: 'Hank',
        contactEmail: 'hank@globex.test',
      }),
      save: save('leadId'),
    },
    { tool: 'leads.list', input: () => ({}), check: expectListed('leadId') },
    {
      tool: 'leads.update',
      input: (c) => ({ leadId: c.leadId, nextStep: 'Send proposal' }),
    },
    { tool: 'leads.get', input: (c) => ({ leadId: c.leadId }) },
    {
      tool: 'leads.convert',
      input: (c) => ({ leadId: c.leadId, displayName: 'Globex Client' }),
    },
    {
      tool: 'leads.delete',
      prepare: async (c) => {
        c.throwawayLeadId = idOf(
          await execute('leads.create', { companyName: 'Throwaway Lead' }),
        );
      },
      input: (c) => ({ leadId: c.throwawayLeadId }),
    },

    // Projects and tasks
    {
      tool: 'projects.create',
      input: (c) => ({
        clientId: c.clientId,
        name: 'Launch campaign',
        workspaceId: c.workspaceId,
      }),
      save: save('projectId'),
    },
    {
      tool: 'projects.list',
      input: () => ({}),
      check: expectListed('projectId'),
    },
    {
      tool: 'projects.update',
      input: (c) => ({ projectId: c.projectId, name: 'Launch campaign v2' }),
    },
    {
      tool: 'projects.get',
      input: (c) => ({ projectId: c.projectId }),
      check: (out) => expect(out).toMatchObject({ name: 'Launch campaign v2' }),
    },
    {
      tool: 'tasks.create',
      input: (c) => ({
        name: 'Design hero banner',
        projectId: c.projectId,
        clientId: c.clientId,
        priority: 'MEDIUM',
        dueDate: day(3),
        assigneeUserIds: [c.secondUserId],
      }),
      save: save('taskId'),
    },
    {
      tool: 'tasks.list',
      input: (c) => ({ projectId: c.projectId }),
      check: expectListed('taskId'),
    },
    {
      tool: 'tasks.update',
      input: (c) => ({ taskId: c.taskId, description: 'Use brand colours' }),
    },
    {
      tool: 'tasks.set_priority',
      input: (c) => ({ taskIds: [c.taskId], priority: 'URGENT' }),
    },
    {
      tool: 'tasks.transition',
      input: (c) => ({ taskId: c.taskId, status: 'IN_PROGRESS' }),
    },
    {
      tool: 'tasks.comment',
      input: (c) => ({ taskId: c.taskId, body: 'First draft ready' }),
    },
    {
      tool: 'tasks.get',
      input: (c) => ({ taskId: c.taskId }),
      check: (out) =>
        expect(out).toMatchObject({
          priority: 'URGENT',
          status: 'IN_PROGRESS',
        }),
    },

    // Time tracking
    {
      tool: 'time.create',
      input: (c) => ({
        taskId: c.taskId,
        projectId: c.projectId,
        minutes: 45,
        note: 'Sketches',
        date: day(0),
      }),
      save: save('timeEntryId'),
    },
    {
      tool: 'time.list',
      input: () => ({}),
      check: expectListed('timeEntryId'),
    },
    { tool: 'time.get', input: (c) => ({ entryId: c.timeEntryId }) },
    { tool: 'time.timer.start', input: (c) => ({ taskId: c.taskId }) },
    { tool: 'time.timer.get', input: () => ({}) },
    { tool: 'time.timer.stop', input: () => ({}) },
    { tool: 'time.delete', input: (c) => ({ entryId: c.timeEntryId }) },

    // Content
    {
      tool: 'content.create',
      input: (c) => ({
        clientId: c.clientId,
        projectId: c.projectId,
        title: 'Diwali teaser',
        caption: 'Lights, camera, Acme!',
        contentType: 'STATIC_POST',
        platforms: ['instagram'],
      }),
      save: save('contentId'),
    },
    {
      tool: 'content.list',
      input: (c) => ({ clientId: c.clientId }),
      check: expectListed('contentId'),
    },
    {
      tool: 'content.update',
      input: (c) => ({ contentId: c.contentId, caption: 'Updated caption' }),
    },
    {
      tool: 'content.transition',
      input: (c) => ({ contentId: c.contentId, status: 'IN_REVIEW' }),
    },
    {
      tool: 'content.review',
      input: (c) => ({ contentId: c.contentId, status: 'APPROVED' }),
    },
    {
      tool: 'content.reorder',
      input: (c) => ({ clientId: c.clientId, orderedIds: [c.contentId] }),
    },
    {
      tool: 'content.schedule',
      input: (c) => ({ contentId: c.contentId, scheduledAt: future(7) }),
    },
    {
      tool: 'content.schedule_variant',
      prepare: async (c) => {
        const account = await prisma.socialAccount.create({
          data: {
            organizationId: c.orgId,
            clientId: c.clientId,
            platform: 'instagram',
            externalAccountId: `ig-${stamp}`,
            displayName: 'Acme IG',
          },
        });
        const channel = await prisma.socialChannel.create({
          data: {
            organizationId: c.orgId,
            accountId: account.id,
            channelType: 'instagram',
            externalId: `ig-ch-${stamp}`,
            name: 'Acme feed',
          },
        });
        const variant = await prisma.contentVariant.create({
          data: {
            organizationId: c.orgId,
            contentItemId: c.contentId,
            channelId: channel.id,
          },
        });
        c.variantId = variant.id;
      },
      input: (c) => ({ variantId: c.variantId, scheduledAt: future(8) }),
    },
    {
      tool: 'content.get',
      input: (c) => ({ contentId: c.contentId }),
      check: (out) => expect(out).toMatchObject({ caption: 'Updated caption' }),
    },
    {
      tool: 'content.publish',
      input: (c) => ({ contentId: c.contentId, status: 'PUBLISHED' }),
    },
    {
      tool: 'content.delete',
      prepare: async (c) => {
        c.throwawayContentId = idOf(
          await execute('content.create', {
            clientId: c.clientId,
            title: 'Throwaway post',
            contentType: 'STORY',
          }),
        );
      },
      input: (c) => ({ contentId: c.throwawayContentId }),
    },

    // Approvals and feedback
    {
      tool: 'approvals.create',
      input: (c) => ({
        subjectType: 'CONTENT',
        subjectId: c.contentId,
        stepName: 'Client review',
      }),
      save: save('approvalId'),
    },
    {
      tool: 'approvals.list',
      input: () => ({}),
      check: expectListed('approvalId'),
    },
    { tool: 'approvals.get', input: (c) => ({ approvalId: c.approvalId }) },
    {
      tool: 'approvals.act',
      input: (c) => ({
        approvalId: c.approvalId,
        action: 'APPROVED',
        comment: 'Ship it',
      }),
    },
    {
      tool: 'feedback.create',
      input: (c) => ({
        subjectType: 'CONTENT',
        subjectId: c.contentId,
        title: 'Colour feedback',
      }),
      save: save('threadId'),
    },
    {
      tool: 'feedback.list',
      input: () => ({}),
      check: expectListed('threadId'),
    },
    { tool: 'feedback.get', input: (c) => ({ threadId: c.threadId }) },
    {
      tool: 'feedback.update',
      input: (c) => ({ threadId: c.threadId, status: 'RESOLVED' }),
    },
    {
      tool: 'feedback.comments.add',
      input: (c) => ({
        subjectType: 'CONTENT',
        subjectId: c.contentId,
        body: 'Make logo bigger',
      }),
    },
    {
      tool: 'feedback.comments.list',
      input: (c) => ({ subjectType: 'CONTENT', subjectId: c.contentId }),
      check: (out) => expect(listOf(out).length).toBeGreaterThan(0),
    },

    // Calendar
    {
      tool: 'calendar.create',
      input: (c) => ({
        title: 'Kickoff call',
        startsAt: future(2),
        endsAt: future(2.05),
        clientId: c.clientId,
      }),
      save: save('calendarItemId'),
    },
    { tool: 'calendar.list', input: () => ({ from: day(-1), to: day(30) }) },
    {
      tool: 'calendar.update',
      input: (c) => ({
        itemId: c.calendarItemId,
        title: 'Kickoff call (moved)',
      }),
    },
    { tool: 'calendar.get', input: (c) => ({ itemId: c.calendarItemId }) },
    {
      tool: 'calendar.shoots.create',
      input: (c) => ({
        title: 'Product shoot',
        startsAt: future(5),
        clientId: c.clientId,
        location: 'Studio 3',
      }),
    },

    // Chat
    {
      tool: 'chat.rooms.client',
      input: (c) => ({ clientId: c.clientId }),
      save: save('roomId'),
    },
    {
      tool: 'chat.rooms.list',
      input: () => ({}),
      check: expectListed('roomId'),
    },
    {
      tool: 'chat.messages.send',
      input: (c) => ({
        roomId: c.roomId,
        body: 'Hello team, banner is in progress',
      }),
      save: save('messageId'),
    },
    {
      tool: 'chat.messages.list',
      input: (c) => ({ roomId: c.roomId, limit: 20 }),
    },
    {
      tool: 'chat.messages.edit',
      input: (c) => ({
        roomId: c.roomId,
        messageId: c.messageId,
        body: 'Banner is ready for review',
      }),
    },
    {
      tool: 'chat.mark_read',
      input: (c) => ({ roomId: c.roomId, messageId: c.messageId }),
    },
    {
      tool: 'chat.messages.delete',
      input: (c) => ({ roomId: c.roomId, messageId: c.messageId }),
    },
    {
      tool: 'chat.rooms.create',
      input: (c) => ({ name: 'Launch squad', memberUserIds: [c.secondUserId] }),
    },
    { tool: 'chat.dms.open', input: (c) => ({ otherUserId: c.secondUserId }) },

    // Media
    {
      tool: 'media.folders.ensure_client',
      input: (c) => ({ clientId: c.clientId }),
    },
    {
      tool: 'media.folders.create',
      input: (c) => ({ name: 'Campaign assets', clientId: c.clientId }),
      save: save('folderId'),
    },
    { tool: 'media.folders.list', input: (c) => ({ clientId: c.clientId }) },
    {
      tool: 'media.upload',
      input: (c) => ({
        filename: 'hero.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        clientId: c.clientId,
      }),
      save: (out, c) => {
        c.assetId = idOf(out, 'assetId') || idOf(out);
        const uploadUrl = (out as { uploadUrl?: string }).uploadUrl ?? '';
        expect(c.assetId).toBeTruthy();
        expect(uploadUrl).toBeTruthy();
        c.mediaUploadUrl = uploadUrl;
      },
    },
    { tool: 'media.list', input: (c) => ({ clientId: c.clientId }) },
    {
      tool: 'media.update',
      input: (c) => ({
        assetId: c.assetId,
        name: 'hero-final.png',
        tags: ['hero'],
      }),
    },
    { tool: 'media.get', input: (c) => ({ assetId: c.assetId }) },
    {
      tool: 'media.download_url',
      prepare: async (c) => {
        const body = Buffer.alloc(2048, 1);
        const put = await fetch(c.mediaUploadUrl, {
          method: 'PUT',
          headers: {
            'content-type': 'image/png',
            'content-length': String(body.byteLength),
          },
          body,
        });
        expect(put.ok).toBe(true);
        await app
          .get(MediaService)
          .completeUpload(c.orgId, c.userId, c.assetId);
      },
      input: (c) => ({ assetId: c.assetId }),
    },
    { tool: 'media.delete', input: (c) => ({ assetId: c.assetId }) },
    { tool: 'media.folders.delete', input: (c) => ({ folderId: c.folderId }) },

    // Finance
    {
      tool: 'invoices.create',
      input: (c) => ({
        clientId: c.clientId,
        number: `INV-${stamp}`,
        dueDate: day(30),
        lines: [
          { description: 'Social retainer', quantity: 1, unitMinor: 5_000_000 },
        ],
      }),
      save: save('invoiceId'),
    },
    {
      tool: 'invoices.list',
      input: (c) => ({ clientId: c.clientId }),
      check: expectListed('invoiceId'),
    },
    {
      tool: 'invoices.update',
      input: (c) => ({ invoiceId: c.invoiceId, taxRate: 18 }),
    },
    { tool: 'invoices.get', input: (c) => ({ invoiceId: c.invoiceId }) },
    { tool: 'invoices.delete', input: (c) => ({ invoiceId: c.invoiceId }) },
    {
      tool: 'contracts.create',
      input: (c) => ({
        clientId: c.clientId,
        title: 'Retainer MSA',
        type: 'MSA',
        startDate: day(0),
      }),
      save: save('contractId'),
    },
    {
      tool: 'contracts.list',
      input: (c) => ({ clientId: c.clientId }),
      check: expectListed('contractId'),
    },
    {
      tool: 'contracts.update',
      input: (c) => ({ contractId: c.contractId, title: 'Retainer MSA 2026' }),
    },
    {
      tool: 'contracts.sign',
      prepare: async (c) => {
        const pdf = await app.get(StorageService).putObject({
          organizationId: c.orgId,
          filename: `agreement-${c.contractId}.pdf`,
          mimeType: 'application/pdf',
          body: Buffer.from('%PDF-1.4\n%%EOF\n'),
        });
        await prisma.contract.update({
          where: { id: c.contractId },
          data: { storageKey: pdf.storageKey },
        });
      },
      input: (c) => ({
        contractId: c.contractId,
        signerName: 'Wile E. Coyote',
      }),
    },
    {
      tool: 'contracts.download_url',
      input: (c) => ({ contractId: c.contractId }),
    },

    // Automations
    {
      tool: 'automations.create',
      input: () => ({
        name: 'Notify on approval',
        trigger: 'content.approved',
        action: 'notify.team',
        enabled: false,
      }),
      save: save('automationId'),
    },
    {
      tool: 'automations.list',
      input: () => ({}),
      check: expectListed('automationId'),
    },
    {
      tool: 'automations.update',
      input: (c) => ({
        automationId: c.automationId,
        name: 'Notify team on approval',
      }),
    },
    {
      tool: 'automations.get',
      input: (c) => ({ automationId: c.automationId }),
    },
    {
      tool: 'automations.publish',
      input: (c) => ({ automationId: c.automationId }),
    },
    {
      tool: 'automations.run',
      input: (c) => ({ automationId: c.automationId }),
    },
    { tool: 'automations.runs.list', input: () => ({}) },
    {
      tool: 'automations.archive',
      input: (c) => ({ automationId: c.automationId }),
    },

    // Knowledge and workflows
    {
      tool: 'knowledge.create',
      input: () => ({
        title: 'Brand voice guide',
        body: 'Be bold, be kind.',
        category: 'playbook',
      }),
      save: save('articleId'),
    },
    {
      tool: 'knowledge.list',
      input: () => ({}),
      check: expectListed('articleId'),
    },
    {
      tool: 'knowledge.update',
      input: (c) => ({
        articleId: c.articleId,
        body: 'Be bold, be kind, be brief.',
      }),
    },
    { tool: 'knowledge.get', input: (c) => ({ articleId: c.articleId }) },
    { tool: 'knowledge.delete', input: (c) => ({ articleId: c.articleId }) },
    {
      tool: 'workflows.create',
      input: () => ({
        name: `Content flow ${stamp}`,
        stages: [
          { name: 'Draft', key: 'draft' },
          { name: 'Review', key: 'review' },
        ],
      }),
      save: (out, c) => {
        c.workflowId = idOf(out);
        expect(c.workflowId).toBeTruthy();
      },
    },
    {
      tool: 'workflows.list',
      input: () => ({}),
      check: expectListed('workflowId'),
    },
    {
      tool: 'workflows.get',
      input: (c) => ({ workflowId: c.workflowId }),
      save: save('workflowVersionId', 'versionId'),
    },
    {
      tool: 'workflows.publish',
      input: (c) => ({ versionId: c.workflowVersionId }),
    },
    {
      tool: 'workflows.update',
      input: (c) => ({ workflowId: c.workflowId, active: true }),
    },
    { tool: 'workflows.delete', input: (c) => ({ workflowId: c.workflowId }) },

    // Integrations
    {
      tool: 'integrations.create',
      prepare: async (c) => {
        const provider =
          (await prisma.integrationProvider.findFirst({
            where: { isActive: true },
          })) ??
          (await prisma.integrationProvider.create({
            data: {
              key: `e2e-${stamp}`,
              name: 'E2E Provider',
              category: 'social',
              manifest: {},
            },
          }));
        c.providerId = provider.id;
      },
      input: (c) => ({
        providerId: c.providerId,
        clientId: c.clientId,
        label: 'Acme IG',
      }),
      save: save('connectionId'),
    },
    { tool: 'integrations.list', input: () => ({}) },
    {
      tool: 'integrations.update',
      input: (c) => ({ connectionId: c.connectionId, label: 'Acme Instagram' }),
    },
    {
      tool: 'integrations.get',
      input: (c) => ({ connectionId: c.connectionId }),
    },

    // Reports, analytics, search, intelligence
    {
      tool: 'reports.create',
      input: (c) => ({
        clientId: c.clientId,
        title: 'October report',
        periodStart: day(-30),
        periodEnd: day(0),
      }),
      save: save('reportId'),
    },
    {
      tool: 'reports.list',
      input: () => ({}),
      check: expectListed('reportId'),
    },
    { tool: 'reports.get', input: (c) => ({ reportId: c.reportId }) },
    { tool: 'analytics.list', input: () => ({ from: day(-30) }) },
    { tool: 'search.query', input: () => ({ query: 'Acme' }) },
    {
      tool: 'intelligence.summarize',
      input: (c) => ({ scope: 'client', clientId: c.clientId }),
    },

    // Notifications
    {
      tool: 'notifications.list',
      prepare: async (c) => {
        const notification = await prisma.notification.create({
          data: {
            organizationId: c.orgId,
            recipientId: c.userId,
            typeKey: 'e2e.test',
            title: 'E2E notification',
            body: 'Check the banner',
          },
        });
        c.notificationId = notification.id;
      },
      input: () => ({ unreadOnly: true }),
      check: expectListed('notificationId'),
    },
    {
      tool: 'notifications.mark_read',
      input: (c) => ({ notificationId: c.notificationId }),
    },
    { tool: 'notifications.mark_all_read', input: () => ({}) },

    // Agents
    {
      tool: 'agents.definitions.create',
      input: () => ({
        name: `Research Lead ${stamp}`,
        systemPrompt: 'Summarize client health weekly.',
        subAgents: [{ name: 'Analyst', role: 'Pull metrics' }],
      }),
      save: save('agentDefinitionId'),
    },
    {
      tool: 'agents.definitions.list',
      input: () => ({}),
      check: expectListed('agentDefinitionId'),
    },
    {
      tool: 'agents.schedules.create',
      input: (c) => ({
        name: 'Monday standup reminder',
        prompt: 'List urgent tasks',
        cron: '0 9 * * 1',
        timezone: 'Asia/Kolkata',
        agentDefinitionId: c.agentDefinitionId,
      }),
    },
    { tool: 'agents.schedules.list', input: () => ({}) },

    // Destructive cleanup last
    {
      tool: 'tasks.delete',
      prepare: async (c) => {
        c.throwawayTaskId = idOf(
          await execute('tasks.create', {
            title: 'Throwaway task',
            projectId: c.projectId,
          }),
        );
      },
      input: (c) => ({ taskId: c.throwawayTaskId }),
    },
    {
      tool: 'roles.delete',
      prepare: async (c) => {
        c.throwawayRoleId = idOf(
          await execute('roles.create', {
            name: `Throwaway ${stamp}`,
            permissions: [Permissions.CLIENTS_VIEW],
          }),
        );
      },
      input: (c) => ({ roleId: c.throwawayRoleId }),
    },
    { tool: 'members.deactivate', input: (c) => ({ userId: c.secondUserId }) },
    {
      tool: 'audit.list',
      input: () => ({ limit: 50 }),
      check: (out) => expect(listOf(out).length).toBeGreaterThan(0),
    },
  ];

  it('scenario covers every catalog tool exactly once', () => {
    const ids = steps.map((step) => step.tool);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      CAPABILITY_CATALOG.map((tool) => tool.id).sort(),
    );
    expect(ids).toHaveLength(140);
  });

  it('registers an owner org, a second member and an agent run', async () => {
    if (dbUnavailable) return;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `cap-e2e-${stamp}@test.agency`,
        password: 'SecurePass123!@#',
        firstName: 'Cap',
        lastName: 'E2E',
        organizationName: 'Capability E2E Agency',
        organizationSlug: `cap-e2e-${stamp}`,
      })
      .expect(201);

    accessToken = res.body.accessToken;
    ctx.orgId = res.body.organization.id;
    ctx.userId = res.body.user.id;

    const second = await prisma.user.create({
      data: {
        email: `teammate-${stamp}@test.agency`,
        firstName: 'Pranav',
        lastName: 'Teammate',
      },
    });
    await prisma.organizationMembership.create({
      data: { organizationId: ctx.orgId, userId: second.id, type: 'MEMBER' },
    });
    ctx.secondUserId = second.id;

    const session = await prisma.agentSession.create({
      data: {
        organizationId: ctx.orgId,
        userId: ctx.userId,
        title: 'Capability e2e',
      },
    });
    const run = await prisma.agentRun.create({
      data: {
        organizationId: ctx.orgId,
        sessionId: session.id,
        userId: ctx.userId,
        prompt: 'e2e capability run',
        status: 'RUNNING',
        multiAgent: true,
      },
    });
    ctx.runId = run.id;

    const list = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${ctx.orgId}/capabilities`)
      .set(auth())
      .expect(200);
    expect(list.body).toHaveLength(140);
  }, 60_000);

  it('confirmation runs the approved input, not a resubmitted one', async () => {
    if (dbUnavailable) return;
    const pending = await mcpCall('roles.create', {
      name: `Approved ${stamp}`,
      permissions: [Permissions.CLIENTS_VIEW],
    });
    expect(pending.result.status).toBe('pending_confirmation');

    const confirm = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${ctx.orgId}/capabilities/execute`)
      .set(auth())
      .send({
        toolId: 'roles.create',
        input: {
          name: `Tampered ${stamp}`,
          permissions: [Permissions.CLIENTS_VIEW],
        },
        pendingActionId: pending.result.pendingActionId,
      });
    expect(confirm.body.status).toBe('ok');
    expect(confirm.body.output).toMatchObject({ name: `Approved ${stamp}` });

    const reuse = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${ctx.orgId}/capabilities/execute`)
      .set(auth())
      .send({
        toolId: 'roles.create',
        input: {},
        pendingActionId: pending.result.pendingActionId,
      });
    expect(reuse.status).toBe(400);
  });

  for (const step of steps) {
    const meta = CATALOG.get(step.tool);
    const label = `${step.tool} [${meta?.riskTier ?? '?'}${meta?.requiresConfirmation ? ' + confirm' : ''}]`;
    it(label, async () => {
      if (dbUnavailable) return;
      await step.prepare?.(ctx);
      const output = await execute(step.tool, step.input(ctx));
      step.save?.(output, ctx);
      step.check?.(output, ctx);
    });
  }
});
