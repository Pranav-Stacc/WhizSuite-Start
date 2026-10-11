import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { can } from '@/shared/auth/permissions';
import { projectsRepository, type Project } from '../data/projects.repository';
import { listTasks } from '@/features/tasks/services/tasks.service';

export interface ProjectWithProgress extends Project {
  taskCount: number;
  doneCount: number;
  progress: number;
}

export async function listProjects(): Promise<Project[]> {
  return projectsRepository.list();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return projectsRepository.get(id);
}

export async function listProjectsWithProgress(): Promise<ProjectWithProgress[]> {
  const [projects, tasks] = await Promise.all([
    listProjects(),
    (await can(Permissions.TASKS_VIEW)) ? listTasks() : Promise.resolve([]),
  ]);
  const counts = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    if (!task.projectId) continue;
    const entry = counts.get(task.projectId) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (task.status === 'DONE') entry.done += 1;
    counts.set(task.projectId, entry);
  }
  return projects.map((p) => {
    const c = counts.get(p.id) ?? { total: 0, done: 0 };
    return { ...p, taskCount: c.total, doneCount: c.done, progress: c.total ? Math.round((c.done / c.total) * 100) : 0 };
  });
}
