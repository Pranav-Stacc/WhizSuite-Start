import {
  CAPABILITY_CATALOG,
  clientsCreateInput,
  leadsCreateInput,
  tasksCreateInput,
} from '@agency-os/contracts';
import { normalizeCapabilityInput } from './normalize-capability-input';

describe('normalizeCapabilityInput', () => {
  it('maps name → displayName for clients.create', () => {
    expect(
      normalizeCapabilityInput('clients.create', { name: 'Acme Corp' }),
    ).toEqual({ displayName: 'Acme Corp' });
  });

  it('maps name → companyName for leads.create', () => {
    expect(
      normalizeCapabilityInput('leads.create', { name: 'Acme Corp' }),
    ).toEqual({ companyName: 'Acme Corp' });
  });

  it('maps name → title for tasks.create', () => {
    expect(
      normalizeCapabilityInput('tasks.create', { name: 'Ship demo' }),
    ).toEqual({ title: 'Ship demo' });
  });

  it('uppercases knowledge categories to match the enum', () => {
    expect(
      normalizeCapabilityInput('knowledge.create', {
        title: 'T',
        body: 'B',
        category: 'sop',
      }),
    ).toEqual({ title: 'T', body: 'B', category: 'SOP' });
  });

  it('drops empty strings so optional url/email do not fail', () => {
    expect(
      normalizeCapabilityInput('clients.create', {
        displayName: 'Acme',
        website: '',
      }),
    ).toEqual({ displayName: 'Acme' });
  });

  it('passes Zod after aliasing common LLM mistakes', () => {
    expect(
      clientsCreateInput.safeParse(
        normalizeCapabilityInput('clients.create', { name: 'Acme Corp' }),
      ).success,
    ).toBe(true);
    expect(
      leadsCreateInput.safeParse(
        normalizeCapabilityInput('leads.create', { company: 'Acme Corp' }),
      ).success,
    ).toBe(true);
    expect(
      tasksCreateInput.safeParse(
        normalizeCapabilityInput('tasks.create', { name: 'Demo task' }),
      ).success,
    ).toBe(true);
  });
});

describe('CAPABILITY_CATALOG', () => {
  it('exposes 140 unique tools with Zod input schemas', () => {
    expect(CAPABILITY_CATALOG).toHaveLength(140);
    const ids = CAPABILITY_CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(140);
    for (const tool of CAPABILITY_CATALOG) {
      expect(tool.inputSchema).toBeDefined();
      expect(typeof tool.inputSchema.safeParse).toBe('function');
    }
  });
});
