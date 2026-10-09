import 'server-only';
import type { RunningTimerDto, TimeEntryDto } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { orgPath } from '@/shared/api/live/utils';
import { getSession } from '@/shared/auth/session';
import type { ActiveTimer } from './time.repository';

const TIME_TAG = 'time';

async function timerPath(): Promise<{ org: string; path: string }> {
  const org = (await getSession())?.orgId ?? '';
  return { org, path: `${orgPath(org, 'time')}/timer` };
}

function toActiveTimer(dto: RunningTimerDto): ActiveTimer {
  return {
    id: dto.id,
    userId: dto.userId,
    taskId: dto.taskId ?? '',
    projectId: dto.projectId ?? '',
    clientId: dto.clientId ?? '',
    startedAt: dto.startedAt,
  };
}

export async function fetchRunningTimer(): Promise<ActiveTimer | undefined> {
  const { org, path } = await timerPath();
  const dto = await apiFetch<RunningTimerDto | null>(path, { tags: [`org:${org}:${TIME_TAG}`] });
  return dto ? toActiveTimer(dto) : undefined;
}

export async function startRunningTimer(taskId: string): Promise<void> {
  const { path } = await timerPath();
  await apiFetch<RunningTimerDto>(`${path}/start`, { method: 'POST', body: { taskId } });
}

export async function stopRunningTimer(): Promise<TimeEntryDto> {
  const { path } = await timerPath();
  return apiFetch<TimeEntryDto>(`${path}/stop`, { method: 'POST' });
}
