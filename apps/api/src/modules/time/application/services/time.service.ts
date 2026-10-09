import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  Permissions,
  TIME_ENTRY_MINUTES_MAX,
  type RunningTimerDto,
  type TimeEntryDto,
} from '@agency-os/contracts';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import type { AppConfig } from '../../../../shared/config/app.config';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AuthService } from '../../../identity/application/services/auth.service';
import { WorkService } from '../../../work/application/services/work.service';
import {
  TimeRepository,
  type TimeEntryRecord,
} from '../../infrastructure/repositories/time.repository';
import type { CreateTimeEntryDto } from '../../interface/http/dto/time-entry.dto';

const ENTITY_TYPE = 'timeEntry';
const DEFAULT_BILLABLE = true;
const MS_PER_MINUTE = 60_000;
/** A stopped timer always records at least this much time. */
const MIN_TIMER_MINUTES = 1;
/** Members who manage other people may also remove their time entries. */
const ENTRY_MODERATOR_PERMISSION = Permissions.MEMBERS_EDIT;

@Injectable()
export class TimeService {
  constructor(
    private readonly repository: TimeRepository,
    private readonly audit: AuditService,
    private readonly identity: AuthService,
    private readonly work: WorkService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<TimeEntryDto[]> {
    const limit = this.config.get('TIME_ENTRY_LIST_LIMIT', { infer: true });
    return this.toDtos(
      organizationId,
      await this.repository.list(organizationId, limit),
    );
  }

  async get(organizationId: string, id: string): Promise<TimeEntryDto> {
    return this.toDto(organizationId, await this.require(organizationId, id));
  }

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    input: CreateTimeEntryDto,
  ): Promise<TimeEntryDto> {
    const membershipId = await this.actorMembership(organizationId, actor);
    const project = input.projectId
      ? await this.work.get(organizationId, input.projectId)
      : null;
    if (input.taskId) await this.work.getTask(organizationId, input.taskId);
    const startedAt = new Date(input.date);
    const record = await this.repository.create(organizationId, {
      membershipId,
      projectId: input.projectId,
      clientId: input.clientId ?? project?.clientId,
      taskId: input.taskId,
      minutes: input.minutes,
      startedAt,
      endedAt: new Date(startedAt.getTime() + input.minutes * MS_PER_MINUTE),
      description: input.note,
      billable: input.billable ?? DEFAULT_BILLABLE,
    });
    const dto = await this.toDto(organizationId, record);
    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: 'timeEntry.create',
      entityType: ENTITY_TYPE,
      entityId: dto.id,
      after: { ...dto },
    });
    return dto;
  }

  async runningTimer(
    organizationId: string,
    actor: AuthenticatedUser,
  ): Promise<RunningTimerDto | null> {
    const membershipId = await this.actorMembership(organizationId, actor);
    const record = await this.repository.findRunning(
      organizationId,
      membershipId,
    );
    return record ? toRunningTimerDto(record, actor.userId) : null;
  }

  /** Starts a timer on a task; any timer already running for the caller is discarded. */
  async startTimer(
    organizationId: string,
    actor: AuthenticatedUser,
    taskId: string,
  ): Promise<RunningTimerDto> {
    const membershipId = await this.actorMembership(organizationId, actor);
    const task = await this.work.getTask(organizationId, taskId);
    const project = task.projectId
      ? await this.work.get(organizationId, task.projectId)
      : null;
    const record = await this.repository.replaceRunning(organizationId, {
      membershipId,
      taskId,
      projectId: task.projectId ?? undefined,
      clientId: project?.clientId ?? task.clientId ?? undefined,
      minutes: 0,
      startedAt: new Date(),
      description: task.title,
      billable: DEFAULT_BILLABLE,
    });
    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: 'timeEntry.timer_start',
      entityType: ENTITY_TYPE,
      entityId: record.id,
      after: { taskId, startedAt: record.startedAt.toISOString() },
    });
    return toRunningTimerDto(record, actor.userId);
  }

  /** Stops the caller's running timer and turns it into a finished entry. */
  async stopTimer(
    organizationId: string,
    actor: AuthenticatedUser,
  ): Promise<TimeEntryDto> {
    const membershipId = await this.actorMembership(organizationId, actor);
    const running = await this.repository.findRunning(
      organizationId,
      membershipId,
    );
    if (!running) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        'No timer is running',
      );
    }
    const endedAt = new Date();
    const elapsed = Math.round(
      (endedAt.getTime() - running.startedAt.getTime()) / MS_PER_MINUTE,
    );
    const minutes = Math.min(
      TIME_ENTRY_MINUTES_MAX,
      Math.max(MIN_TIMER_MINUTES, elapsed),
    );
    const record = await this.repository.finish(organizationId, running.id, {
      minutes,
      endedAt,
    });
    const dto = await this.toDto(organizationId, record);
    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: 'timeEntry.timer_stop',
      entityType: ENTITY_TYPE,
      entityId: dto.id,
      after: { ...dto },
    });
    return dto;
  }

  async remove(
    organizationId: string,
    actor: AuthenticatedUser,
    id: string,
  ): Promise<void> {
    const record = await this.require(organizationId, id);
    const membershipId = await this.actorMembership(organizationId, actor);
    const moderator =
      actor.permissions?.includes(ENTRY_MODERATOR_PERMISSION) ?? false;
    if (record.membershipId !== membershipId && !moderator) {
      throw problem(
        HttpStatus.FORBIDDEN,
        'Forbidden',
        ErrorCodes.FORBIDDEN,
        'You can only delete your own time entries',
      );
    }
    const before = await this.toDto(organizationId, record);
    await this.repository.delete(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId: actor.userId,
      actorType: 'user',
      action: 'timeEntry.delete',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { ...before },
    });
  }

  private async require(
    organizationId: string,
    id: string,
  ): Promise<TimeEntryRecord> {
    const record = await this.repository.findById(organizationId, id);
    if (!record) {
      throw problem(
        HttpStatus.NOT_FOUND,
        'Not Found',
        ErrorCodes.NOT_FOUND,
        'Time entry not found',
      );
    }
    return record;
  }

  private async actorMembership(
    organizationId: string,
    actor: AuthenticatedUser,
  ): Promise<string> {
    const membershipId = await this.identity.activeMembershipIdForUser(
      organizationId,
      actor.userId,
    );
    if (!membershipId) {
      throw problem(
        HttpStatus.FORBIDDEN,
        'Forbidden',
        ErrorCodes.FORBIDDEN,
        'Not an active member of this organization',
      );
    }
    return membershipId;
  }

  private async toDtos(
    organizationId: string,
    records: TimeEntryRecord[],
  ): Promise<TimeEntryDto[]> {
    const users = await this.identity.userIdsByMembership(organizationId, [
      ...new Set(records.map((record) => record.membershipId)),
    ]);
    return records.map((record) => toTimeEntryDto(record, users));
  }

  private async toDto(
    organizationId: string,
    record: TimeEntryRecord,
  ): Promise<TimeEntryDto> {
    const users = await this.identity.userIdsByMembership(organizationId, [
      record.membershipId,
    ]);
    return toTimeEntryDto(record, users);
  }
}

function toRunningTimerDto(
  record: TimeEntryRecord,
  userId: string,
): RunningTimerDto {
  return {
    id: record.id,
    userId,
    taskId: record.taskId,
    projectId: record.projectId,
    clientId: record.clientId,
    startedAt: record.startedAt.toISOString(),
  };
}

function toTimeEntryDto(
  record: TimeEntryRecord,
  users: Map<string, string>,
): TimeEntryDto {
  return {
    id: record.id,
    userId: users.get(record.membershipId) ?? null,
    projectId: record.projectId,
    clientId: record.clientId,
    taskId: record.taskId,
    minutes: record.minutes,
    startedAt: record.startedAt.toISOString(),
    note: record.description,
    billable: record.billable,
    createdAt: record.createdAt.toISOString(),
  };
}
