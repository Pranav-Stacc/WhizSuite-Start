'use server';

import {
  TaskStatuses,
  createTaskSchema,
  resolveTaskAssigneeIds,
  type TaskStatus,
  Permissions,
} from '@agency-os/contracts';
import { authorize } from '@/shared/auth/permissions';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { dateKeyToIso } from '@/shared/lib/format';
import { transitionTask } from '@/shared/api/live/mutations';
import { isLiveMode } from '@/shared/config/env';
import { recordAudit } from '@/features/audit/services/audit.service';
import { pushNotification } from '@/features/notifications/services/notifications.service';
import { getProject } from '@/features/projects/services/projects.service';
import { tasksRepository, type Task } from '../data/tasks.repository';

async function notifyNewAssignees(
  task: Task,
  previous: readonly string[],
  actorId: string,
): Promise<void> {
  const known = new Set(previous);
  for (const userId of task.assigneeIds) {
    if (known.has(userId) || userId === actorId) continue;
    await pushNotification({
      userId,
      kind: 'task',
      title: t('tasks.assigned.title'),
      body: t('tasks.assigned.body', { title: task.title }),
      href: '/tasks',
    });
  }
}

async function notifyStatusChange(
  task: Task,
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  actorId: string,
): Promise<void> {
  for (const userId of task.assigneeIds) {
    if (userId === actorId) continue;
    await pushNotification({
      userId,
      kind: 'task',
      title: t('tasks.statusChanged.title'),
      body: t('tasks.statusChanged.body', {
        title: task.title,
        status: t(`status.task.${toStatus}`),
      }),
      href: '/tasks',
    });
  }
  void fromStatus;
}

export async function createTaskAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.TASKS_CREATE);
    const parsed = parseInput(createTaskSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const project = input.projectId ? await getProject(input.projectId) : undefined;
    if (input.projectId && !project) {
      return fail(t('toast.failed'), { projectId: 'validation.required' });
    }

    const assigneeIds = resolveTaskAssigneeIds(input);
    const task = await tasksRepository.create({
      projectId: project?.id,
      clientId: project?.clientId ?? input.clientId,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assigneeIds,
      assigneeId: assigneeIds[0],
      dueDate: input.dueDate ? dateKeyToIso(input.dueDate) : undefined,
      estimateHours: input.estimateHours || undefined,
      contentItemId: input.contentItemId,
      createdAt: new Date().toISOString(),
    });
    await notifyNewAssignees(task, [], session.userId);
    await recordAudit({
      action: 'task.created',
      entityType: 'task',
      entityId: task.id,
      entityLabel: task.title,
      summary: 'Created task',
    });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.created'));
  });
}

export async function updateTaskAction(id: string, raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.TASKS_EDIT);
    const parsed = parseInput(createTaskSchema, raw);
    if (!parsed.ok) return parsed.result;
    const input = parsed.data;
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    const project = input.projectId ? await getProject(input.projectId) : undefined;
    if (input.projectId && !project) {
      return fail(t('toast.failed'), { projectId: 'validation.required' });
    }

    const assigneeIds = resolveTaskAssigneeIds(input);
    const after = await tasksRepository.update(id, {
      projectId: project?.id,
      clientId: project?.clientId ?? input.clientId,
      title: input.title,
      description: input.description ?? '',
      status: input.status,
      priority: input.priority,
      assigneeIds,
      assigneeId: assigneeIds[0],
      dueDate: input.dueDate ? dateKeyToIso(input.dueDate) : undefined,
      estimateHours: input.estimateHours || undefined,
      contentItemId: input.contentItemId,
    });
    if (isLiveMode && before.status !== input.status) await transitionTask(id, input.status);
    if (after) await notifyNewAssignees(after, before.assigneeIds, session.userId);
    if (after && before.status !== input.status) {
      await notifyStatusChange(after, before.status, input.status, session.userId);
    }
    await recordAudit({
      action: 'task.updated',
      entityType: 'task',
      entityId: id,
      entityLabel: input.title,
      summary: 'Updated task',
      diff:
        before.status !== input.status
          ? { status: { from: before.status, to: input.status } }
          : undefined,
    });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.updated'));
  });
}

export async function moveTaskAction(id: string, status: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await authorize(Permissions.TASKS_TRANSITION);
    if (!TaskStatuses.includes(status as TaskStatus)) return fail(t('toast.failed'));
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    if (isLiveMode) await transitionTask(id, status);
    else await tasksRepository.update(id, { status: status as TaskStatus });
    const after = (await tasksRepository.get(id)) ?? { ...before, status: status as TaskStatus };
    await notifyStatusChange(after, before.status, status as TaskStatus, session.userId);
    await recordAudit({
      action: 'task.status_changed',
      entityType: 'task',
      entityId: id,
      entityLabel: before.title,
      summary: `Moved task to ${t(`status.task.${status as TaskStatus}`)}`,
      diff: { status: { from: before.status, to: status } },
    });
    await refreshData('tasks', 'projects');
    return succeed();
  });
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    await authorize(Permissions.TASKS_DELETE);
    const before = await tasksRepository.get(id);
    if (!before) return fail(t('toast.failed'));
    await tasksRepository.remove(id);
    await recordAudit({
      action: 'task.deleted',
      entityType: 'task',
      entityId: id,
      entityLabel: before.title,
      summary: 'Deleted task',
    });
    await refreshData('tasks', 'projects');
    return succeed(undefined, t('tasks.deleted'));
  });
}
