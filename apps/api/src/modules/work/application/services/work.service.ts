import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DomainEventTypes,
  ErrorCodes,
  type Priority,
  type TaskStatus,
} from '@agency-os/contracts';
import {
  ProblemDetailsException,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AuthService } from '../../../identity/application/services/auth.service';
import { WorkRepository } from '../../infrastructure/repositories/work.repository';
import type {
  CreateTaskDto,
  UpdateTaskDto,
} from '../../interface/http/dto/task.dto';

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
  ) {}

  list(organizationId: string) {
    return this.repository.listProjects(organizationId);
  }

  async get(organizationId: string, id: string) {
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
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    data: Record<string, unknown>,
  ) {
    const item = await this.repository.createProject(organizationId, data);
    await this.outbox.write({
      type: DomainEventTypes.PROJECT_CREATED,
      version: 1,
      organizationId,
      payload: { projectId: (item as { id: string }).id },
      actor: { id: actorId, type: 'user' },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'project.create',
      entityType: 'project',
      entityId: (item as { id: string }).id,
      after: item,
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    await this.get(organizationId, id);
    await this.repository.updateProject(organizationId, id, data);
    return this.get(organizationId, id);
  }

  async listTasks(organizationId: string, projectId?: string) {
    const tasks = await this.repository.listTasks(organizationId, projectId);
    return this.withAssigneeUsers(organizationId, tasks);
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
    await this.get(organizationId, dto.projectId);
    const assigneeMembershipId = dto.assigneeUserId
      ? await this.membershipFor(organizationId, dto.assigneeUserId)
      : undefined;
    const created = await this.repository.createTask(organizationId, {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: dto.status ?? DEFAULT_TASK_STATUS,
      priority: dto.priority ?? DEFAULT_TASK_PRIORITY,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes,
      assigneeMembershipId,
      createdById: actorId,
    });
    const task = await this.withAssigneeUser(organizationId, created);
    await this.outbox.write({
      type: DomainEventTypes.TASK_CREATED,
      version: 1,
      organizationId,
      payload: { taskId: task.id, projectId: task.projectId },
      actor: { id: actorId, type: 'user' },
    });
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
    if (dto.projectId) await this.get(organizationId, dto.projectId);
    const assigneeMembershipId = dto.assigneeUserId
      ? await this.membershipFor(organizationId, dto.assigneeUserId)
      : dto.assigneeUserId;
    const changed = await this.repository.updateTask(organizationId, taskId, {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      estimateMinutes: dto.estimateMinutes,
      assigneeMembershipId,
    });
    const updated = await this.withAssigneeUser(organizationId, changed);
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
      payload: { taskId, fromStatus, toStatus },
      actor: { id: actorId, type: 'user' },
    });
    return updated;
  }

  private async requireTask(organizationId: string, taskId: string) {
    const task = await this.repository.findTask(organizationId, taskId);
    if (!task) {
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
        'Assignee is not an active member of this organization',
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
