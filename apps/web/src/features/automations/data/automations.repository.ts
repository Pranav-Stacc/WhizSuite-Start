import 'server-only';
import type { AutomationAction, AutomationTrigger } from '@agency-os/contracts';
import { automationRunsLive, automationsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow, hoursAgo } from '@/shared/lib/format';

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

export const automationsRepository = createRepository<Automation>('automations', () => [
  { id: 'au1', name: 'Notify client when content is ready', trigger: 'content.submitted', action: 'notify.client', enabled: true, runs: 142, failures: 1, lastRunAt: hoursAgo(2), createdAt: daysFromNow(-200) },
  { id: 'au2', name: 'Create follow-up task after approval', trigger: 'content.approved', action: 'create.task', enabled: true, runs: 96, failures: 0, lastRunAt: daysFromNow(-1, 16), createdAt: daysFromNow(-180) },
  { id: 'au3', name: 'Alert team about overdue tasks', trigger: 'task.overdue', action: 'notify.team', enabled: true, runs: 58, failures: 0, lastRunAt: daysFromNow(-1, 8), createdAt: daysFromNow(-150) },
  { id: 'au4', name: 'Dunning email for overdue invoices', trigger: 'invoice.overdue', action: 'send.email', enabled: false, runs: 12, failures: 2, lastRunAt: daysFromNow(-12, 10), createdAt: daysFromNow(-120) },
  { id: 'au5', name: 'Notify on chat mentions', trigger: 'chat.message_mentioned', action: 'post.webhook', enabled: true, runs: 31, failures: 0, lastRunAt: hoursAgo(1), createdAt: daysFromNow(-60) },
], automationsLive);

export const automationRunsRepository = createRepository<AutomationRun>('automation-runs', () => [
  { id: 'ar1', automationId: 'au1', at: hoursAgo(2), ok: true, detail: 'Emailed Neha Kapoor — “Origin of the bean” is ready for review' },
  { id: 'ar2', automationId: 'au5', at: hoursAgo(1), ok: true, detail: 'Posted to #community: negative DM from @rakesh_m' },
  { id: 'ar3', automationId: 'au3', at: daysFromNow(-1, 8), ok: true, detail: '1 overdue task: “Fix off-brand colours in last batch”' },
  { id: 'ar4', automationId: 'au4', at: daysFromNow(-12, 10), ok: false, detail: 'SMTP temporarily unavailable — retried 3 times' },
], automationRunsLive);