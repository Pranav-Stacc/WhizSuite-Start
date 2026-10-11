import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DomainEventTypes,
  ErrorCodes,
  ProjectStatuses,
  type Priority,
  type ProjectDto,
  type ProjectStatus,
  type TaskStatus,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ClientsService } from '../../../clients/application/services/clients.service';
import { TenancyService } from '../../../tenancy/application/services/tenancy.service';
import {
  ProblemDetailsException,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import {
  projectMatchesScope,
  taskMatchesScope,
} from '../../../../shared/tenant/scope-filters';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AuthService } from '../../../identity/application/services/auth.service';
import {
  WorkRepository,
  type ProjectRecord,
} from '../../infrastructure/repositories/work.repository';
import type {
  CreateProjectDto,
  UpdateProjectDto,
} from '../../interface/http/dto/project.dto';
import type {
  CreateTaskCommentDto,
  CreateTaskDto,
  UpdateTaskDto,
} from '../../interface/http/dto/task.dto';

const DATE_KEY_LENGTH = 10;
const DEFAULT_PROJECT_STATUS: ProjectStatus = 'ACTIVE';

const toDate = (value: string | undefined) =>
  value ? new Date(value) : undefined;
const toDateKey = (value: Date | null) =>
  value ? value.toISOString().slice(0, DATE_KEY_LENGTH) : null;

function assertDateRange(start?: string, end?: string): void {
  if (start && end && new Date(end) < new Date(start)) {
    throw problem(
      HttpStatus.BAD_REQUEST,
      'Bad Request',
      ErrorCodes.VALIDATION_FAILED,
      'endDate must not be before startDate',
    );
  }
}

function toProjectStatus(value: string): ProjectStatus {
  return ProjectStatuses.find((s) => s === value) ?? DEFAULT_PROJECT_STATUS;
}

function toProjectDto(record: ProjectRecord): ProjectDto {
  return {
    id: record.id,
    clientId: record.clientId,
    workspaceId: record.workspaceId,
    name: record.name,
    type: record.type,
    status: toProjectStatus(record.status),
    startDate: toDateKey(record.startDate),
    endDate: toDateKey(record.endDate),
    budgetMinor: record.budgetMinor,
    currency: record.currency,
    ownerUserId: record.ownerId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

const TASK_ENTITY_TYPE = 'task';
const DEFAULT_TASK_STATUS: TaskStatus = 'TODO';
const DEFAULT_TASK_PRIORITY: Priority = 'MEDIUM';

@Injectable()
export class WorkService {
  constructor(
    private readonly repository: WorkRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly identity: AuthService,
    private readonly clients: ClientsService,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<ProjectDto[]> {
    const limit = this.config.get('PROJECT_LIST_LIMIT', { infer: true });
    const rows = await this.repository.listProjects(
      organizationId,
      limit,
      TenantContext.projectScopeFilter(),
    );
    return rows.map(toProjectDto);
  }

  async get(organizationId: string, id: string): Promise<ProjectDto> {
    const item = await this.repository.findProject(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    if (!projectMatchesScope(item, TenantContext.projectScopeFilter() ?? {})) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    return toProjectDto(item);
  }

  async create(
    organizationId: string,
    actorId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectDto> {
    await this.clients.get(organizationId, dto.clientId);
    if (dto.ownerUserId)
      await this.membershipFor(organizationId, dto.ownerUserId);
    assertDateRange(dto.startDate, dto.endDate);
    const workspaceId = await this.tenancy.defaultWorkspaceId(organizationId);
    if (!workspaceId) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'No workspace configured',
        ErrorCodes.VALIDATION_FAILED,
      );
    }
    const item = toProjectDto(
      await this.repository.createProject(organizationId, {
        workspaceId,
        clientId: dto.clientId,
        name: dto.name,
        type: dto.type,
        status: dto.status ?? DEFAULT_PROJECT_STATUS,
        startDate: toDate(dto.startDate),
        endDate: toDate(dto.endDate),
        budgetMinor: dto.budgetMinor,
        ownerId: dto.ownerUserId,
      }),
    );
    await this.outbox.write({
      type: DomainEventTypes.PROJECT_CREATED,
      version: 1,
      organizationId,
      payload: { projectId: item.id },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'project.create',
      entityType: 'project',
      entityId: item.id,
      after: { ...item },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const before = await this.get(organizationId, id);
    if (dto.ownerUserId)
      await this.membershipFor(organizationId, dto.ownerUserId);
    assertDateRange(
      dto.startDate ?? before.startDate ?? undefined,
      dto.endDate ?? before.endDate ?? undefined,
    );
    await this.repository.updateProject(organizationId, id, {
      name: dto.name,
      type: dto.type,
      status: dto.status,
      startDate: toDate(dto.startDate),
      endDate: toDate(dto.endDate),
      budgetMinor: dto.budgetMinor,
      ownerId: dto.ownerUserId,
    });
    const after = await this.get(organizationId, id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'project.update',
      entityType: 'project',
      entityId: id,
      before: { ...before },
      after: { ...after },
    });
    return after;
  }

  async listTasks(organizationId: string, projectId?: string) {
    const limit = this.config.get('RESOURCE_LIST_LIMIT', { infer: true });
    const tasks = await this.repository.listTasks(
      organizationId,
      projectId,
      limit,
      TenantContext.taskScope(),
    );
    return this.withAssigneeUsers(organizationId, tasks);
  }

  /** Calendar feed: open tasks due in `[from, to)`. */
  listTasksDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds?: string[],
  ) {
    const taskScope = TenantContext.taskScope();
    const mergedScope =
      clientIds?.length && taskScope
        ? { ...taskScope, clientIds }
        : clientIds?.length
          ? { clientIds }
          : taskScope;
    return this.repository.listTasksDueInRange(
      organizationId,
      range,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
      mergedScope,
    );
  }

  /** Calendar feed: incomplete project milestones due in range. */
  listMilestonesDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds?: string[],
  ) {
    const projectScope = TenantContext.projectScopeFilter();
    const mergedScope =
      clientIds?.length && projectScope
        ? { ...projectScope, clientIds }
        : clientIds?.length
          ? { clientIds }
          : projectScope;
    return this.repository.listMilestonesDueInRange(
      organizationId,
      range,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
      mergedScope,
    );
  }

  async getTask(organizationId: string, taskId: string) {
    return this.withAssigneeUser(
      organizationId,
      await this.requireTask(organizationId, taskId),
    );
  }

  async createTask(
    organizationId: string,
    actorId: string,
    dto: CreateTaskDto,
  ) {
    const links = await this.resolveTaskLinks(organizationId, {
      projectId: dto.projectId,
      clientId: dto.clientId,
    });
    const assigneeMembershipIds = await this.membershipIdsFor(
      organizationId,
      mergeAssigneeIds(dto.assigneeUserIds, dto.assigneeUserId),
    );
    const created = await this.repository.createTask(organizationId, {
      projectId: links.projectId,
      clientId: links.clientId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: dto.status ?? DEFAULT_TASK_STATUS,
      priority: dto.priority ?? DEFAULT_TASK_PRIORITY,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes,
      assigneeMembershipIds,
      createdById: actorId,
      calendarItemId: dto.calendarItemId,
      contentItemId: dto.contentItemId,
    });
    const task = await this.withAssigneeUser(organizationId, created);
    await this.outbox.write({
      type: DomainEventTypes.TASK_CREATED,
      version: 1,
      organizationId,
      payload: {
        taskId: task.id,
        projectId: task.projectId,
        clientId: task.clientId,
      },
      actor: { id: actorId, type: 'user' },
    });
    await this.announceAssignees(organizationId, actorId, task, []);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'task.create',
      entityType: TASK_ENTITY_TYPE,
      entityId: task.id,
      after: { ...task },
    });
    return task;
  }

  async updateTask(
    organizationId: string,
    actorId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    const before = await this.getTask(organizationId, taskId);
    const links =
      dto.projectId !== undefined || dto.clientId !== undefined
        ? await this.resolveTaskLinks(organizationId, {
            projectId:
              dto.projectId === undefined
                ? (before.projectId ?? undefined)
                : (dto.projectId ?? undefined),
            clientId:
              dto.clientId === undefined
                ? (before.clientId ?? undefined)
                : (dto.clientId ?? undefined),
            clearingProject: dto.projectId === null,
            clearingClient: dto.clientId === null,
          })
        : undefined;
    const assigneeMembershipIds = await this.resolveAssigneeChange(
      organizationId,
      dto,
    );
    const changed = await this.repository.updateTask(organizationId, taskId, {
      projectId: links === undefined ? undefined : (links.projectId ?? null),
      clientId: links === undefined ? undefined : (links.clientId ?? null),
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes,
      assigneeMembershipIds,
      contentItemId: dto.contentItemId,
    });
    const updated = await this.withAssigneeUser(organizationId, changed);
    await this.announceAssignees(
      organizationId,
      actorId,
      updated,
      before.assigneeUserIds,
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'task.update',
      entityType: TASK_ENTITY_TYPE,
      entityId: taskId,
      before: { ...before },
      after: { ...updated },
    });
    return updated;
  }

  async addTaskComment(
    organizationId: string,
    actorId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
  ) {
    const task = await this.getTask(organizationId, taskId);
    const comment = await this.repository.createComment(organizationId, {
      taskId,
      authorId: actorId,
      body: dto.body.trim(),
    });
    await this.outbox.write({
      type: DomainEventTypes.TASK_COMMENTED,
      version: 1,
      organizationId,
      payload: {
        taskId,
        title: task.title,
        commentId: comment.id,
        authorId: actorId,
        recipientIds: task.assigneeUserIds,
      },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'task.comment',
      entityType: TASK_ENTITY_TYPE,
      entityId: taskId,
      after: { commentId: comment.id },
    });
    return comment;
  }

  /** Emits one assignment event per newly added assignee. */
  private async announceAssignees(
    organizationId: string,
    actorId: string,
    task: { id: string; title: string; assigneeUserIds: string[] },
    previous: readonly string[],
  ): Promise<void> {
    const known = new Set(previous);
    for (const assigneeUserId of task.assigneeUserIds) {
      if (known.has(assigneeUserId)) continue;
      await this.outbox.write({
        type: DomainEventTypes.TASK_ASSIGNED,
        version: 1,
        organizationId,
        payload: { taskId: task.id, title: task.title, assigneeUserId },
        actor: { id: actorId, type: 'user' },
      });
    }
  }

  async deleteTask(
    organizationId: string,
    actorId: string,
    taskId: string,
  ): Promise<void> {
    const before = await this.getTask(organizationId, taskId);
    await this.repository.softDeleteTask(organizationId, taskId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'task.delete',
      entityType: TASK_ENTITY_TYPE,
      entityId: taskId,
      before: { ...before },
    });
  }

  async transitionTask(
    organizationId: string,
    actorId: string,
    taskId: string,
    toStatus: TaskStatus,
  ) {
    const task = await this.requireTask(organizationId, taskId);
    const fromStatus = task.status;
    const updated = await this.withAssigneeUser(
      organizationId,
      await this.repository.updateTask(organizationId, taskId, {
        status: toStatus,
      }),
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'task.transition',
      entityType: TASK_ENTITY_TYPE,
      entityId: taskId,
      before: { status: fromStatus },
      after: { status: toStatus },
    });
    await this.repository.recordStateHistory({
      organizationId,
      entityType: 'TASK',
      entityId: taskId,
      fromState: fromStatus,
      toState: toStatus,
      actorId,
    });
    await this.outbox.write({
      type: DomainEventTypes.TASK_STATE_CHANGED,
      version: 1,
      organizationId,
      payload: {
        taskId,
        title: updated.title,
        fromStatus,
        toStatus,
        recipientIds: updated.assigneeUserIds,
      },
      actor: { id: actorId, type: 'user' },
    });
    return updated;
  }

  /**
   * Resolves optional project/client links. Project always wins for clientId when set.
   * Clearing project keeps an explicit client unless that is also cleared.
   */
  private async resolveTaskLinks(
    organizationId: string,
    input: {
      projectId?: string;
      clientId?: string;
      clearingProject?: boolean;
      clearingClient?: boolean;
    },
  ): Promise<{ projectId?: string; clientId?: string }> {
    if (input.clearingProject && input.clearingClient) {
      return {};
    }
    if (input.projectId) {
      const project = await this.get(organizationId, input.projectId);
      return { projectId: project.id, clientId: project.clientId };
    }
    if (input.clearingProject) {
      if (input.clearingClient || !input.clientId) return {};
      await this.clients.get(organizationId, input.clientId);
      return { clientId: input.clientId };
    }
    if (input.clientId) {
      await this.clients.get(organizationId, input.clientId);
      return { clientId: input.clientId };
    }
    return {};
  }

  private async resolveAssigneeChange(
    organizationId: string,
    dto: UpdateTaskDto,
  ): Promise<string[] | undefined> {
    if (dto.assigneeUserIds !== undefined) {
      return this.membershipIdsFor(organizationId, dto.assigneeUserIds);
    }
    if (dto.assigneeUserId === undefined) return undefined;
    if (dto.assigneeUserId === null) return [];
    return this.membershipIdsFor(organizationId, [dto.assigneeUserId]);
  }

  private async membershipIdsFor(
    organizationId: string,
    userIds: readonly string[],
  ): Promise<string[]> {
    const unique = [...new Set(userIds)];
    const membershipIds: string[] = [];
    for (const userId of unique) {
      membershipIds.push(await this.membershipFor(organizationId, userId));
    }
    return membershipIds;
  }

  private async requireTask(organizationId: string, taskId: string) {
    const task = await this.repository.findTask(organizationId, taskId);
    if (!task || !taskMatchesScope(task, TenantContext.taskScope() ?? {})) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    return task;
  }

  private async membershipFor(
    organizationId: string,
    userId: string,
  ): Promise<string> {
    const membershipId = await this.identity.activeMembershipIdForUser(
      organizationId,
      userId,
    );
    if (!membershipId) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Unprocessable Entity',
        ErrorCodes.VALIDATION_FAILED,
        'User is not an active member of this organization',
      );
    }
    return membershipId;
  }

  /** Adds `assigneeUserIds`, since clients identify people by user id, not membership id. */
  private async withAssigneeUsers<T extends AssignedTask>(
    organizationId: string,
    tasks: T[],
  ): Promise<Array<WithAssigneeUsers<T>>> {
    const membershipIds = new Set(
      tasks.flatMap((task) => task.assignees.map((a) => a.membershipId)),
    );
    const users = await this.identity.userIdsByMembership(organizationId, [
      ...membershipIds,
    ]);
    return tasks.map((task) => addAssigneeUsers(task, users));
  }

  private async withAssigneeUser<T extends AssignedTask>(
    organizationId: string,
    task: T,
  ): Promise<WithAssigneeUsers<T>> {
    const users = await this.identity.userIdsByMembership(
      organizationId,
      task.assignees.map((a) => a.membershipId),
    );
    return addAssigneeUsers(task, users);
  }
}

interface AssignedTask {
  assignees: { membershipId: string }[];
}

type WithAssigneeUsers<T> = T & { assigneeUserIds: string[] };

function addAssigneeUsers<T extends AssignedTask>(
  task: T,
  users: Map<string, string>,
): WithAssigneeUsers<T> {
  return {
    ...task,
    assigneeUserIds: task.assignees.flatMap(
      (a) => users.get(a.membershipId) ?? [],
    ),
  };
}

function mergeAssigneeIds(
  ids: string[] | undefined,
  single: string | undefined,
): string[] {
  return [...new Set([...(ids ?? []), ...(single ? [single] : [])])];
}
