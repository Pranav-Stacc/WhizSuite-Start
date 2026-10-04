import { Injectable } from '@nestjs/common';
import { DomainEventTypes, ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { WorkRepository } from '../../infrastructure/repositories/work.repository';
import type { CreateTaskDto, UpdateTaskDto } from '../../interface/http/dto/task.dto';

@Injectable()
export class WorkService {
  constructor(
    private readonly repository: WorkRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.repository.listProjects(organizationId);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findProject(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return item;
  }

  async create(organizationId: string, actorId: string, data: Record<string, unknown>) {
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
      after: item as Record<string, unknown>,
    });
    return item;
  }

  async update(organizationId: string, actorId: string, id: string, data: Record<string, unknown>) {
    await this.get(organizationId, id);
    await this.repository.updateProject(organizationId, id, data);
    return this.get(organizationId, id);
  }

  listTasks(organizationId: string, projectId?: string) {
    return this.repository.listTasks(organizationId, projectId);
  }

  async getTask(organizationId: string, taskId: string) {
    const task = await this.repository.findTask(organizationId, taskId);
    if (!task) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return task;
  }

  async createTask(organizationId: string, actorId: string, dto: CreateTaskDto) {
    const task = await this.repository.createTask(organizationId, {
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      priority: dto.priority ?? 'MEDIUM',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdById: actorId,
    });
    await this.outbox.write({
      type: DomainEventTypes.TASK_CREATED,
      version: 1,
      organizationId,
      payload: { taskId: task.id, projectId: task.projectId },
      actor: { id: actorId, type: 'user' },
    });
    return task;
  }

  async updateTask(
    organizationId: string,
    actorId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    await this.getTask(organizationId, taskId);
    return this.repository.updateTask(organizationId, taskId, dto as Record<string, unknown>);
  }

  async transitionTask(
    organizationId: string,
    actorId: string,
    taskId: string,
    toStatus: string,
  ) {
    const task = await this.getTask(organizationId, taskId);
    const fromStatus = task.status;
    const updated = await this.repository.updateTask(organizationId, taskId, {
      status: toStatus,
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
}
