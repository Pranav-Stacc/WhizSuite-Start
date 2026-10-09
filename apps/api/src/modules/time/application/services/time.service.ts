import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type MembershipType,
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
/** Membership types that may remove other people's time entries. */
const ENTRY_MODERATOR_TYPES: readonly MembershipType[] = ['OWNER', 'ADMIN'];

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
    const record = await this.repository.create(organizationId, {
      membershipId,
      projectId: input.projectId,
      clientId: input.clientId ?? project?.clientId,
      taskId: input.taskId,
      minutes: input.minutes,
      startedAt: new Date(input.date),
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

  async remove(
    organizationId: string,
    actor: AuthenticatedUser,
    id: string,
  ): Promise<void> {
    const record = await this.require(organizationId, id);
    const membershipId = await this.actorMembership(organizationId, actor);
    const moderator = ENTRY_MODERATOR_TYPES.some(
      (type) => type === actor.membershipType,
    );
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
