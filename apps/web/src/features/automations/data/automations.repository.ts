import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export const AutomationTriggers = ['content.submitted', 'content.approved', 'content.published', 'task.overdue', 'invoice.overdue', 'lead.won', 'inbox.negative'] as const;
export type AutomationTrigger = (typeof AutomationTriggers)[number];

export const AutomationActions = ['notify.client', 'notify.team', 'create.task', 'send.email', 'post.webhook'] as const;
export type AutomationAction = (typeof AutomationActions)[number];

export interface Automation extends Entity {
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled: boolean;
  runs: number;
  failures: number;
  lastRunAt?: string;
  createdAt: string;
}

export interface AutomationRun extends Entity {
  automationId: string;
  at: string;
  ok: boolean;
  detail: string;
}

export interface Workflow extends Entity {
  name: string;
  stages: string[];
  requiresClientApproval: boolean;
  slaHours: number;
  active: boolean;
}

export const automationsRepository = createRepository<Automation>('automations', () => [
  { id: 'au1', name: 'Notify client when content is ready', trigger: 'content.submitted', action: 'notify.client', enabled: true, runs: 142, failures: 1, lastRunAt: daysFromNow(0, 9), createdAt: daysFromNow(-200) },
  { id: 'au2', name: 'Create follow-up task after approval', trigger: 'content.approved', action: 'create.task', enabled: true, runs: 96, failures: 0, lastRunAt: daysFromNow(-1, 16), createdAt: daysFromNow(-180) },
  { id: 'au3', name: 'Alert team about overdue tasks', trigger: 'task.overdue', action: 'notify.team', enabled: true, runs: 58, failures: 0, lastRunAt: daysFromNow(-1, 8), createdAt: daysFromNow(-150) },
  { id: 'au4', name: 'Dunning email for overdue invoices', trigger: 'invoice.overdue', action: 'send.email', enabled: false, runs: 12, failures: 2, lastRunAt: daysFromNow(-12, 10), createdAt: daysFromNow(-120) },
  { id: 'au5', name: 'Escalate negative comments to #community', trigger: 'inbox.negative', action: 'post.webhook', enabled: true, runs: 31, failures: 0, lastRunAt: daysFromNow(0, 7), createdAt: daysFromNow(-60) },
]);

export const automationRunsRepository = createRepository<AutomationRun>('automation-runs', () => [
  { id: 'ar1', automationId: 'au1', at: daysFromNow(0, 9), ok: true, detail: 'Emailed Neha Kapoor — “Origin of the bean” is ready for review' },
  { id: 'ar2', automationId: 'au5', at: daysFromNow(0, 7), ok: true, detail: 'Posted to #community: negative DM from @rakesh_m' },
  { id: 'ar3', automationId: 'au3', at: daysFromNow(-1, 8), ok: true, detail: '1 overdue task: “Fix off-brand colours in last batch”' },
  { id: 'ar4', automationId: 'au4', at: daysFromNow(-12, 10), ok: false, detail: 'SMTP temporarily unavailable — retried 3 times' },
]);

export const workflowsRepository = createRepository<Workflow>('workflows', () => [
  { id: 'wf1', name: 'Standard content approval', stages: ['Draft', 'Internal review', 'Client approval', 'Scheduled', 'Published'], requiresClientApproval: true, slaHours: 48, active: true },
  { id: 'wf2', name: 'Fast-track (internal only)', stages: ['Draft', 'Internal review', 'Scheduled', 'Published'], requiresClientApproval: false, slaHours: 12, active: true },
  { id: 'wf3', name: 'Video production', stages: ['Brief', 'Script', 'Edit', 'Client approval', 'Published'], requiresClientApproval: true, slaHours: 96, active: false },
]);
