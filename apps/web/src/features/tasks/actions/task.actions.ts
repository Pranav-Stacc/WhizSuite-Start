'use server';

import { TaskStatuses, createTaskSchema, type TaskStatus } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { ROLES_STAFF } from '@/shared/navigation/nav-config';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateKeyToIso } from '@/shared/lib/format';
import { recordAudit } from '@/features/audit/services/audit.service';
import { pushNotification } from '@/features/notifications/services/notifications.service';
import { getProject } from '@/features/projects/services/projects.service';
import { tasksRepository, type Task } from '../data/tasks.repository';

const DEFAULT_ESTIMATE_HOURS = 2;

async function authorize() {
  const session = await requireSession();
  if (!ROLES_STAFF.includes(session.role)) throw new Error('forbidden');
  return session;
}

async function notifyAssignee(task: Task, previousAssignee: string | undefined, actorId: string): Promise<void> {
  if (task.assigneeId && task.assigneeId !== previousAssignee && task.assigneeId !== actorId) {
    await pushNotification({ userId: task.assigneeId, kind: 'task', title: t('tasks.assigned.title'), body: t('tasks.assigned.body', { title: task.title }), href: '/tasks' });
  }
}

export async function createTaskAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createTaskSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const project = await getProject(input.projectId);
    if (!project) return fail(t('toast.failed'), { projectId: 'validation.required' });

    const task = await tasksRepository.create({
      projectId: project.id,
      clientId: project.clientId,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? dateKeyToIso(input.dueDate) : undefined,
      estimateHours: input.estimateHours || DEFAULT_ESTIMATE_HOURS,
      createdAt: new Date().toISOString(),
    });
    await notifyAssignee(task, undefined, session.userId);
    await recordAudit({ action: 'task.created', entityType: 'task', entityId: task.id, entityLabel: task.title, summary: 'Created task' });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.created'));
  });
}

export async function updateTaskAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize();
    const parsed = parseInput(createTaskSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    const project = await getProject(input.projectId);
    if (!project) return fail(t('toast.failed'), { projectId: 'validation.required' });

    const after = await tasksRepository.update(id, {
      projectId: project.id,
      clientId: project.clientId,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate ? dateKeyToIso(input.dueDate) : undefined,
      estimateHours: input.estimateHours || before.estimateHours,
    });
    if (after) await notifyAssignee(after, before.assigneeId, session.userId);
    await recordAudit({
      action: 'task.updated',
      entityType: 'task',
      entityId: id,
      entityLabel: input.title,
      summary: 'Updated task',
      diff: before.status !== input.status ? { status: { from: before.status, to: input.status } } : undefined,
    });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.updated'));
  });
}

export async function moveTaskAction(id: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    if (!TaskStatuses.includes(status as TaskStatus)) return fail(t('toast.failed'));
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await tasksRepository.update(id, { status: status as TaskStatus });
    await recordAudit({ action: 'task.status_changed', entityType: 'task', entityId: id, entityLabel: before.title, summary: `Moved task to ${t(`status.task.${status as TaskStatus}`)}`, diff: { status: { from: before.status, to: status } } });
    await refreshData('tasks', 'projects');
    return succeed();
  });
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize();
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await tasksRepository.remove(id);
    await recordAudit({ action: 'task.deleted', entityType: 'task', entityId: id, entityLabel: before.title, summary: 'Deleted task' });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.deleted'));
  });
}
