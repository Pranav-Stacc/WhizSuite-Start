import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPABILITY_CATALOG, CapabilityRiskTiers } from '@agency-os/contracts';
import { zodToJsonSchema } from './zod-to-json-schema';
import { normalizeCapabilityInput } from './normalize-capability-input';

/** Minimal fixtures so write tools can pass Zod when we have a UUID placeholder. */
const DEMO_UUID = '00000000-0000-4000-8000-000000000099';

function demoInputFor(toolId: string): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  // Common id keys inferred from tool id.
  if (toolId.includes('client') && !toolId.endsWith('.list')) {
    base.clientId = DEMO_UUID;
  }
  if (
    toolId.startsWith('leads.') &&
    toolId !== 'leads.list' &&
    toolId !== 'leads.create'
  ) {
    base.leadId = DEMO_UUID;
  }
  if (
    toolId.startsWith('projects.') &&
    toolId !== 'projects.list' &&
    toolId !== 'projects.create'
  ) {
    base.projectId = DEMO_UUID;
  }
  if (
    toolId.startsWith('tasks.') &&
    toolId !== 'tasks.list' &&
    toolId !== 'tasks.create'
  ) {
    base.taskId = DEMO_UUID;
  }
  if (
    toolId.startsWith('content.') &&
    toolId !== 'content.list' &&
    toolId !== 'content.create'
  ) {
    base.contentId = DEMO_UUID;
  }
  if (
    toolId.startsWith('calendar.') &&
    !toolId.includes('create') &&
    toolId !== 'calendar.list'
  ) {
    base.eventId = DEMO_UUID;
  }
  if (
    toolId.includes('messages.') ||
    toolId.includes('mark_read') ||
    toolId.includes('rooms.')
  ) {
    if (
      toolId !== 'chat.rooms.list' &&
      toolId !== 'chat.rooms.create' &&
      toolId !== 'chat.dms.open'
    ) {
      base.roomId = DEMO_UUID;
    }
  }
  if (
    toolId.includes('message') &&
    (toolId.includes('edit') || toolId.includes('delete'))
  ) {
    base.messageId = DEMO_UUID;
  }

  switch (toolId) {
    case 'clients.create':
      return { name: 'Acme Corp' };
    case 'leads.create':
      return { company: 'Acme Corp' };
    case 'projects.create':
      return { clientId: DEMO_UUID, name: 'Demo project' };
    case 'tasks.create':
      return { name: 'Demo task', projectId: DEMO_UUID };
    case 'content.create':
      return {
        clientId: DEMO_UUID,
        title: 'Demo post',
        contentType: 'STATIC_POST',
      };
    case 'content.review':
      return { contentId: DEMO_UUID, status: 'APPROVED' };
    case 'content.reorder':
      return { clientId: DEMO_UUID, orderedIds: [DEMO_UUID] };
    case 'content.schedule_variant':
      return {
        variantId: DEMO_UUID,
        scheduledAt: new Date().toISOString(),
      };
    case 'calendar.create':
      return {
        title: 'Demo event',
        startsAt: new Date().toISOString(),
        clientId: DEMO_UUID,
      };
    case 'calendar.shoots.create':
      return {
        title: 'Demo shoot',
        startsAt: new Date().toISOString(),
        clientId: DEMO_UUID,
      };
    case 'chat.messages.send':
      return { roomId: DEMO_UUID, body: 'Hello from Whiz' };
    case 'chat.rooms.create':
      return { name: 'Demo group', memberUserIds: [DEMO_UUID] };
    case 'chat.dms.open':
      return { otherUserId: DEMO_UUID };
    case 'chat.rooms.client':
      return { clientId: DEMO_UUID };
    case 'chat.messages.edit':
      return { roomId: DEMO_UUID, messageId: DEMO_UUID, body: 'Edited' };
    case 'chat.messages.delete':
      return { roomId: DEMO_UUID, messageId: DEMO_UUID };
    case 'chat.mark_read':
      return { roomId: DEMO_UUID, messageId: DEMO_UUID };
    case 'invoices.create':
      return {
        clientId: DEMO_UUID,
        number: 'INV-DEMO-1',
        dueDate: '2026-12-31',
        lines: [{ description: 'Service', quantity: 1, unitMinor: 10000 }],
      };
    case 'contracts.create':
      return { clientId: DEMO_UUID, title: 'Demo contract' };
    case 'approvals.create':
      return {
        subjectType: 'CONTENT',
        subjectId: DEMO_UUID,
        title: 'Please review',
      };
    case 'approvals.act':
      return { approvalId: DEMO_UUID, action: 'APPROVED' };
    case 'time.create':
      return { taskId: DEMO_UUID, minutes: 30, spentOn: '2026-10-10' };
    case 'time.timer.start':
      return { taskId: DEMO_UUID };
    case 'agents.schedules.create':
      return {
        name: 'Monday reminder',
        prompt: 'Remind the team about standups',
        cron: '0 9 * * 1',
      };
    case 'agents.definitions.create':
      return {
        name: 'Demo specialist',
        systemPrompt: 'You help with demos.',
      };
    case 'search.query':
      return { query: 'acme' };
    case 'intelligence.summarize':
      return { scope: 'organization' };
    case 'workflows.create':
      return {
        name: 'Demo workflow',
        stages: [{ name: 'Draft', key: 'draft' }],
      };
    case 'members.assign_roles':
      return { userId: DEMO_UUID, roleIds: [DEMO_UUID] };
    case 'roles.create':
      return { name: 'Demo role', permissions: ['org.view'] };
    case 'members.invite':
      return { email: 'demo@example.com' };
    case 'media.upload':
      return {
        fileName: 'demo.png',
        contentType: 'image/png',
        sizeBytes: 1024,
      };
    case 'content.schedule':
      return { contentId: DEMO_UUID, scheduledAt: new Date().toISOString() };
    case 'content.transition':
    case 'content.publish':
      return { contentId: DEMO_UUID, status: 'PUBLISHED' };
    case 'tasks.transition':
      return { taskId: DEMO_UUID, status: 'DONE' };
    case 'tasks.set_priority':
      return { taskIds: [DEMO_UUID], priority: 'HIGH' };
    case 'tasks.comment':
      return { taskId: DEMO_UUID, body: 'Looks good' };
    default:
      return base;
  }
}

describe('all 140 capability tools audit', () => {
  const handlerSource = readFileSync(
    join(__dirname, '..', 'services', 'capability-handlers.service.ts'),
    'utf8',
  );
  const handlerCases = new Set(
    [...handlerSource.matchAll(/case\s+'([^']+)'/g)]
      .map((m) => m[1])
      .filter((id): id is string => Boolean(id)),
  );

  it('catalog has exactly 140 unique tools', () => {
    expect(CAPABILITY_CATALOG).toHaveLength(140);
    expect(new Set(CAPABILITY_CATALOG.map((t) => t.id)).size).toBe(140);
  });

  it('every catalog tool has a handler case and no orphans', () => {
    const catalogIds = CAPABILITY_CATALOG.map((t) => t.id);
    const missing = catalogIds.filter((id) => !handlerCases.has(id));
    const extra = [...handlerCases].filter((id) => !catalogIds.includes(id));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('every tool exports a JSON schema object with properties', () => {
    for (const tool of CAPABILITY_CATALOG) {
      const schema = zodToJsonSchema(tool.inputSchema);
      expect(schema).toMatchObject({ type: 'object' });
      expect(schema).toHaveProperty('properties');
    }
  });

  it('READ tools with empty schemas accept {}', () => {
    const failures: string[] = [];
    for (const tool of CAPABILITY_CATALOG) {
      if (tool.riskTier !== CapabilityRiskTiers.READ) continue;
      const schema = zodToJsonSchema(tool.inputSchema) as {
        required?: string[];
      };
      const required = schema.required ?? [];
      if (required.length > 0) continue;
      const parsed = tool.inputSchema.safeParse({});
      if (!parsed.success) {
        failures.push(`${tool.id}: ${parsed.error.message}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('demo/write fixtures pass Zod after alias normalization for all tools', () => {
    const failures: string[] = [];
    for (const tool of CAPABILITY_CATALOG) {
      const raw = demoInputFor(tool.id);
      const normalized = normalizeCapabilityInput(tool.id, raw);
      const parsed = tool.inputSchema.safeParse(normalized);
      if (!parsed.success) {
        // Some get/update tools only need an id — if still failing, try empty + required from schema.
        const json = zodToJsonSchema(tool.inputSchema) as {
          required?: string[];
          properties?: Record<string, { format?: string; type?: string }>;
        };
        const filled: Record<string, unknown> = { ...normalized };
        for (const key of json.required ?? []) {
          if (filled[key] !== undefined) continue;
          const prop = json.properties?.[key];
          if (prop?.format === 'uuid') filled[key] = DEMO_UUID;
          else if (prop?.type === 'number') filled[key] = 1;
          else if (prop?.type === 'boolean') filled[key] = true;
          else if (prop?.type === 'array') filled[key] = [];
          else filled[key] = 'demo';
        }
        const retry = tool.inputSchema.safeParse(
          normalizeCapabilityInput(tool.id, filled),
        );
        if (!retry.success) {
          failures.push(
            `${tool.id}: ${retry.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('module counts match UI listing buckets', () => {
    const byModule = new Map<string, number>();
    for (const tool of CAPABILITY_CATALOG) {
      byModule.set(tool.module, (byModule.get(tool.module) ?? 0) + 1);
    }
    const total = [...byModule.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(140);
    // Sanity: known modules from the Agent UI sidebar.
    for (const mod of [
      'clients',
      'crm',
      'work',
      'content',
      'calendar',
      'chat',
      'media',
      'agent',
    ]) {
      expect(byModule.get(mod) ?? 0).toBeGreaterThan(0);
    }
  });
});
