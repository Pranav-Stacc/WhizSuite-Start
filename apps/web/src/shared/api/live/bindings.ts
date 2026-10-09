import 'server-only';
import type { LiveBinding } from '@/shared/data/repository';
import type { AuditEntry } from '@/features/audit/data/audit.repository';
import type { Automation, AutomationRun } from '@/features/automations/data/automations.repository';
import type { Client } from '@/features/clients/data/clients.repository';
import type { Post } from '@/features/content/data/content.repository';
import type { InboxItem } from '@/features/inbox/data/inbox.repository';
import type { Invoice } from '@/features/invoices/data/invoices.repository';
import type { Article } from '@/features/knowledge/data/knowledge.repository';
import type { Lead } from '@/features/leads/data/leads.repository';
import type { Asset } from '@/features/media/data/media.repository';
import type { Notification } from '@/features/notifications/data/notifications.repository';
import type { Project } from '@/features/projects/data/projects.repository';
import type { Department } from '@/features/departments/data/departments.repository';
import type { AgencyRole } from '@/features/roles/data/roles.repository';
import type { Member } from '@/features/team/data/members.repository';
import type { Task } from '@/features/tasks/data/tasks.repository';
import type { TimeEntry } from '@/features/time/data/time.repository';
import type { Workflow } from '@/features/workflows/data/workflows.repository';
import {
  articleFromApi,
  articleToApi,
  assetFromApi,
  auditFromApi,
  automationFromApi,
  automationRunFromApi,
  automationToApi,
  clientFromApi,
  clientToApi,
  contentFromApi,
  contentPatchToApi,
  contentToApi,
  inboxFromApi,
  inboxPatchToApi,
  invoiceFromApi,
  invoiceToApi,
  leadFromApi,
  leadToApi,
  departmentFromApi,
  departmentToApi,
  memberFromApi,
  notificationFromApi,
  roleFromApi,
  roleToApi,
  projectFromApi,
  projectPatchToApi,
  projectToApi,
  taskFromApi,
  taskPatchToApi,
  taskToApi,
  timeEntryFromApi,
  timeEntryToApi,
  workflowFromApi,
  workflowToApi,
} from './mappers';
import { orgPath } from './utils';

function binding<T extends { id: string }>(
  segment: string,
  tag: string,
  fromApi: (raw: Record<string, unknown>) => T,
  toApi?: (input: Partial<T>) => Promise<Record<string, unknown>> | Record<string, unknown>,
  opts?: { deletable?: boolean },
): LiveBinding<T> {
  return {
    path: (org) => orgPath(org, segment),
    itemPath: (org, id) => `${orgPath(org, segment)}/${id}`,
    fromApi,
    toApi,
    tag,
    deletable: opts?.deletable ?? true,
  };
}

export const clientsLive = binding<Client>('clients', 'clients', clientFromApi, clientToApi, { deletable: false });
export const projectsLive: LiveBinding<Project> = {
  ...binding<Project>('projects', 'projects', projectFromApi, projectToApi),
  toApiPatch: projectPatchToApi,
};
export const tasksLive: LiveBinding<Task> = {
  ...binding<Task>('tasks', 'tasks', taskFromApi, taskToApi),
  toApiPatch: taskPatchToApi,
};
export const contentLive: LiveBinding<Post> = {
  ...binding<Post>('content', 'content', contentFromApi, contentToApi),
  toApiPatch: contentPatchToApi,
};
export const leadsLive = binding<Lead>('leads', 'leads', leadFromApi, leadToApi);
export const invoicesLive = binding<Invoice>('invoices', 'invoices', invoiceFromApi, invoiceToApi);
export const mediaLive = binding<Asset>('media/assets', 'media', assetFromApi);
export const inboxLive: LiveBinding<InboxItem> = {
  ...binding<InboxItem>('inbox/conversations', 'inbox', inboxFromApi),
  toApiPatch: inboxPatchToApi,
};
export const knowledgeLive = binding<Article>('knowledge/articles', 'knowledge', articleFromApi, articleToApi);
export const automationsLive = binding<Automation>('automations', 'automations', automationFromApi, automationToApi);
export const automationRunsLive: LiveBinding<AutomationRun> = {
  path: (org) => orgPath(org, 'automations/runs'),
  fromApi: automationRunFromApi,
  tag: 'automations',
  deletable: false,
};
export const workflowsLive = binding<Workflow>('workflows', 'workflows', workflowFromApi, workflowToApi);
export const timeLive = binding<TimeEntry>('time/entries', 'time', timeEntryFromApi, timeEntryToApi);

export const auditLive: LiveBinding<AuditEntry> = {
  path: () => 'v1/audit-logs',
  fromApi: auditFromApi,
  tag: 'audit',
  deletable: false,
};

export const rolesLive = binding<AgencyRole>('roles', 'roles', roleFromApi, roleToApi, { deletable: false });
export const departmentsLive = binding<Department>('departments', 'departments', departmentFromApi, departmentToApi, { deletable: false });

export const membersLive: LiveBinding<Member> = {
  path: (org) => orgPath(org, 'members'),
  fromApi: memberFromApi,
  tag: 'team',
  deletable: false,
};

export const invitationsLive: LiveBinding<Member> = {
  path: (org) => orgPath(org, 'invitations'),
  fromApi: memberFromApi,
  tag: 'team',
  deletable: false,
};

export function notificationsLive(userId: string): LiveBinding<Notification> {
  return {
    path: (org) => orgPath(org, 'notifications'),
    fromApi: (raw) => notificationFromApi(raw, userId),
    tag: 'notifications',
    deletable: false,
  };
}
