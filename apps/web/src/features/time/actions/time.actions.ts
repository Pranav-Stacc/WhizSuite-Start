'use server';

import { UserRoles, logTimeSchema } from '@agency-os/contracts';
import { requireSession } from '@/shared/auth/session';
import { isLiveMode } from '@/shared/config/env';
import { fail, succeed, type ActionResult } from '@/shared/data/action-result';
import { guarded, parseInput } from '@/shared/data/action-utils';
import { refreshData } from '@/shared/data/refresh';
import { t } from '@/shared/i18n/t';
import { recordAudit } from '@/features/audit/services/audit.service';
import { getProject } from '@/features/projects/services/projects.service';
import { listTasks } from '@/features/tasks/services/tasks.service';
import { timeRepository, timersRepository } from '../data/time.repository';
import { startRunningTimer, stopRunningTimer } from '../data/timer.api';
import { activeTimerFor } from '../services/time.service';

const MS_PER_MINUTE = 60_000;

export async function startTimerAction(taskId: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    if (isLiveMode) {
      await startRunningTimer(taskId);
    } else {
      const task = (await listTasks()).find((x) => x.id === taskId);
      if (!task) return fail(t('toast.failed'));
      const existing = await activeTimerFor(session.userId);
      if (existing) await timersRepository.remove(existing.id);
      await timersRepository.create({
        userId: session.userId,
        taskId,
        projectId: task.projectId,
        clientId: task.clientId,
        startedAt: new Date().toISOString(),
      });
      await recordAudit({ action: 'time.timer_started', entityType: 'task', entityId: task.id, entityLabel: task.title, summary: 'Started timer' });
    }
    await refreshData('time');
    return succeed(undefined, t('dashboard.timer.started'));
  });
}

export async function stopTimerAction(): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    if (isLiveMode) {
      await stopRunningTimer();
      await refreshData('time');
      return succeed(undefined, t('dashboard.timer.saved'));
    }
    const timer = await activeTimerFor(session.userId);
    if (!timer) return fail(t('toast.failed'));
    const minutes = Math.max(1, Math.round((Date.now() - new Date(timer.startedAt).getTime()) / MS_PER_MINUTE));
    const task = (await listTasks()).find((x) => x.id === timer.taskId);
    const entry = await timeRepository.create({
      userId: session.userId,
      projectId: timer.projectId,
      clientId: timer.clientId,
      taskId: timer.taskId,
      minutes,
      date: new Date().toISOString().slice(0, 10),
      note: task?.title ?? '',
      billable: true,
    });
    await timersRepository.remove(timer.id);
    await recordAudit({ action: 'time.logged', entityType: 'time_entry', entityId: entry.id, entityLabel: task?.title ?? entry.id, summary: `Logged ${minutes} minutes` });
    await refreshData('time');
    return succeed(undefined, t('dashboard.timer.saved'));
  });
}

export async function logTimeAction(raw: unknown): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    const parsed = parseInput(logTimeSchema, raw);
    if (!parsed.ok) return parsed.result;
    const project = await getProject(parsed.data.projectId);
    if (!project) return fail(t('toast.failed'), { projectId: 'validation.required' });
    const entry = await timeRepository.create({
      userId: session.userId,
      projectId: project.id,
      clientId: project.clientId,
      minutes: parsed.data.minutes,
      date: parsed.data.date,
      note: parsed.data.note ?? '',
      billable: true,
    });
    await recordAudit({ action: 'time.logged', entityType: 'time_entry', entityId: entry.id, entityLabel: project.name, summary: `Logged ${entry.minutes} minutes manually` });
    await refreshData('time');
    return succeed(undefined, t('dashboard.timer.saved'));
  });
}

export async function deleteTimeEntryAction(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireSession();
    const entry = await timeRepository.get(id);
    if (!entry || (entry.userId !== session.userId && session.role === UserRoles.CREATOR)) return fail(t('toast.failed'));
    await timeRepository.remove(id);
    await recordAudit({ action: 'time.deleted', entityType: 'time_entry', entityId: id, entityLabel: entry.note || id, summary: 'Deleted time entry' });
    await refreshData('time');
    return succeed(undefined, t('toast.deleted'));
  });
}
