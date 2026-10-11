import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateShootInput } from '@agency-os/contracts';
import { notFound } from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { MediaFoldersService } from '../../../media/application/services/media-folders.service';
import { WorkService } from '../../../work/application/services/work.service';
import { CalendarRepository } from '../../infrastructure/repositories/calendar.repository';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@Injectable()
export class ShootService {
  constructor(
    private readonly calendar: CalendarRepository,
    private readonly folders: MediaFoldersService,
    private readonly work: WorkService,
    private readonly audit: AuditService,
    private readonly googleSync: GoogleCalendarSyncService,
  ) {}

  /**
   * Plans a shoot day: calendar event (optionally on a project) + media folder tree + optional tasks.
   */
  async create(
    organizationId: string,
    actorId: string,
    input: CreateShootInput,
  ) {
    if (!TenantContext.canAccessClient(input.clientId))
      throw notFound('Client not found');
    if (input.projectId) {
      await this.work.get(organizationId, input.projectId);
    }

    const id = randomUUID();
    const connection = await this.googleSync.getConnection(organizationId);
    const syncToGoogle = this.googleSync.resolveSyncToGoogle(
      connection,
      'SHOOT',
      input.syncToGoogle,
    );
    const item = await this.calendar.create(organizationId, {
      id,
      sourceType: 'SHOOT',
      sourceId: id,
      title: input.title.trim(),
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      allDay: input.allDay,
      clientId: input.clientId,
      projectId: input.projectId,
      metadata: { kind: 'shoot' },
      syncToGoogle,
    });

    const folders =
      input.createFolders === false
        ? []
        : await this.folders.createShootFolderTree(organizationId, actorId, {
            clientId: input.clientId,
            projectId: input.projectId,
            calendarItemId: item.id,
            shootTitle: input.title,
          });

    const tasks = [];
    if (input.projectId && input.taskTitles?.length) {
      for (const title of input.taskTitles) {
        const task = await this.work.createTask(organizationId, actorId, {
          projectId: input.projectId,
          title,
          type: 'Shoot',
          calendarItemId: item.id,
          dueDate: input.startsAt.slice(0, 10),
        });
        tasks.push(task);
      }
    }

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/shoots.create',
      entityType: 'calendarItem',
      entityId: item.id,
      after: {
        title: item.title,
        projectId: input.projectId ?? null,
        folderCount: folders.length,
        taskCount: tasks.length,
        syncToGoogle,
      },
    });

    await this.googleSync.enqueueIfNeeded(
      organizationId,
      item.id,
      syncToGoogle,
      actorId,
    );

    return {
      event: item,
      folders,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    };
  }
}
