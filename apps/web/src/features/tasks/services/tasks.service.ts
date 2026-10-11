import 'server-only';
import { isLiveMode } from '@/shared/config/env';
import { activeWorkspaceClientIds, filterByWorkspaceClients } from '@/shared/workspace/active-scope';
import { TENANCY_WORKSPACE_UI_ENABLED } from '@/shared/workspace/tenancy-ui';
import { tasksRepository, type Task } from '../data/tasks.repository';

export async function listTasks(): Promise<Task[]> {
  const rows = await tasksRepository.list();
  if (!isLiveMode || !TENANCY_WORKSPACE_UI_ENABLED) return rows;
  return filterByWorkspaceClients(rows, await activeWorkspaceClientIds());
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, now: number = Date.now()): boolean {
  return task.status !== 'DONE' && task.dueDate !== undefined && new Date(task.dueDate).getTime() < now;
}

export async function overdueTasks(): Promise<Task[]> {
  return (await listTasks()).filter((t) => isOverdue(t));
}

export function openHoursByAssignee(tasks: Task[]): Map<string, number> {
  const hours = new Map<string, number>();
  for (const task of tasks) {
    if (task.status === 'DONE' || task.assigneeIds.length === 0) continue;
    const share = (task.estimateHours ?? 0) / task.assigneeIds.length;
    for (const assigneeId of task.assigneeIds) {
      hours.set(assigneeId, (hours.get(assigneeId) ?? 0) + share);
    }
  }
  return hours;
}
