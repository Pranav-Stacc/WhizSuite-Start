import 'server-only';
import { tasksRepository, type Task } from '../data/tasks.repository';

export async function listTasks(): Promise<Task[]> {
  return tasksRepository.list();
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
    if (task.status === 'DONE' || !task.assigneeId) continue;
    hours.set(task.assigneeId, (hours.get(task.assigneeId) ?? 0) + task.estimateHours);
  }
  return hours;
}
