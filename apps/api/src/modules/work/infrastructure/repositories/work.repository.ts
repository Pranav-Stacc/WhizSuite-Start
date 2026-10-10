import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  projectListWhere,
  taskListWhere,
  milestoneListWhere,
  type StaffProjectScope,
  type StaffTaskScope,
} from '../../../../shared/tenant/scope-filters';

const PROJECT_SELECT = {
  id: true,
  clientId: true,
  workspaceId: true,
  name: true,
  type: true,
  status: true,
  startDate: true,
  endDate: true,
  budgetMinor: true,
  currency: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

export type ProjectRecord = Prisma.ProjectGetPayload<{
  select: typeof PROJECT_SELECT;
}>;

export interface ProjectCreateRow {
  workspaceId: string;
  clientId: string;
  name: string;
  type?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  budgetMinor?: number;
  ownerId?: string;
}

export type ProjectChangeRow = Partial<
  Omit<ProjectCreateRow, 'workspaceId' | 'clientId'>
>;

export interface TaskCreateRow {
  projectId?: string;
  clientId?: string;
  title: string;
  description?: string;
  type?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  estimateMinutes?: number;
  assigneeMembershipIds?: string[];
  createdById: string;
  calendarItemId?: string;
  contentItemId?: string;
}

export interface TaskChangeRow {
  projectId?: string | null;
  clientId?: string | null;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  estimateMinutes?: number;
  /** undefined keeps assignees; array (possibly empty) replaces them. */
  assigneeMembershipIds?: string[];
  contentItemId?: string | null;
}

@Injectable()
export class WorkRepository {
  constructor(private readonly prisma: PrismaService) {}

  listProjects(
    organizationId: string,
    limit: number,
    scope?: StaffProjectScope,
  ) {
    const base: Prisma.ProjectWhereInput = {
      organizationId,
      deletedAt: null,
    };
    return this.prisma.project.findMany({
      where: scope ? projectListWhere(base, scope) : base,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: PROJECT_SELECT,
    });
  }

  findProject(organizationId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: PROJECT_SELECT,
    });
  }

  createProject(organizationId: string, row: ProjectCreateRow) {
    return this.prisma.project.create({
      data: { ...row, organizationId },
      select: PROJECT_SELECT,
    });
  }

  async updateProject(
    organizationId: string,
    id: string,
    row: ProjectChangeRow,
  ): Promise<void> {
    await this.prisma.project.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { ...row, version: { increment: 1 } },
    });
  }

  listTasks(
    organizationId: string,
    projectId?: string,
    limit = 100,
    scope?: StaffTaskScope,
  ) {
    const base: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    };
    return this.prisma.task.findMany({
      where: scope ? taskListWhere(base, scope) : base,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { assignees: true, project: { select: { clientId: true } } },
    });
  }

  /**
   * Open tasks due between `from` (inclusive) and `to` (exclusive), across orgs.
   * Used by the reminder scanner (no tenant context).
   */
  listOpenTasksDueBetween(from: Date, to: Date, limit: number) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { not: 'DONE' },
        dueDate: { gte: from, lt: to },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        title: true,
        dueDate: true,
        createdById: true,
        assignees: { select: { membershipId: true } },
      },
    });
  }

  /** Open tasks whose due date is strictly before `before`. */
  listOpenTasksOverdueBefore(before: Date, limit: number) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { not: 'DONE' },
        dueDate: { lt: before },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        title: true,
        dueDate: true,
        createdById: true,
        assignees: { select: { membershipId: true } },
      },
    });
  }

  /** Open tasks with a due date in range — for the unified calendar feed. */
  listTasksDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    limit: number,
    scope?: StaffTaskScope,
  ) {
    const base: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
      status: { not: 'DONE' },
      dueDate: { gte: range.from, lt: range.to },
    };
    return this.prisma.task.findMany({
      where: scope ? taskListWhere(base, scope) : base,
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        projectId: true,
        clientId: true,
        project: { select: { clientId: true } },
      },
    });
  }

  /** Project milestones with a due date in range. */
  listMilestonesDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    limit: number,
    scope?: StaffProjectScope,
  ) {
    const base: Prisma.ProjectMilestoneWhereInput = {
      organizationId,
      completedAt: null,
      dueDate: { gte: range.from, lt: range.to },
    };
    return this.prisma.projectMilestone.findMany({
      where: scope ? milestoneListWhere(base, scope) : base,
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        name: true,
        dueDate: true,
        projectId: true,
        project: { select: { clientId: true, name: true } },
      },
    });
  }

  findTask(organizationId: string, id: string) {
    return this.prisma.task.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignees: true,
        project: { select: { clientId: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        dependencies: true,
        children: true,
      },
    });
  }

  createTask(organizationId: string, data: TaskCreateRow) {
    const { assigneeMembershipIds, ...fields } = data;
    return this.prisma.task.create({
      data: {
        ...fields,
        organizationId,
        ...(assigneeMembershipIds?.length
          ? {
              assignees: {
                create: assigneeMembershipIds.map((membershipId) => ({
                  organizationId,
                  membershipId,
                })),
              },
            }
          : {}),
      },
      include: { assignees: true },
    });
  }

  /** `assigneeMembershipIds`: undefined keeps assignees; array replaces the full set. */
  updateTask(organizationId: string, id: string, change: TaskChangeRow) {
    const { assigneeMembershipIds, ...fields } = change;
    return this.prisma.$transaction(async (tx) => {
      if (assigneeMembershipIds !== undefined) {
        await tx.taskAssignee.deleteMany({
          where: { organizationId, taskId: id },
        });
        if (assigneeMembershipIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: assigneeMembershipIds.map((membershipId) => ({
              organizationId,
              taskId: id,
              membershipId,
            })),
            skipDuplicates: true,
          });
        }
      }
      await tx.task.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: fields,
      });
      return tx.task.findFirstOrThrow({
        where: { id, organizationId },
        include: { assignees: true },
      });
    });
  }

  async softDeleteTask(organizationId: string, id: string): Promise<void> {
    await this.prisma.task.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  createComment(
    organizationId: string,
    data: { taskId: string; authorId: string; body: string },
  ) {
    return this.prisma.taskComment.create({
      data: {
        organizationId,
        taskId: data.taskId,
        authorId: data.authorId,
        body: data.body,
      },
    });
  }

  recordStateHistory(data: {
    organizationId: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    actorId: string;
  }) {
    return this.prisma.entityStateHistory.create({
      data: {
        organizationId: data.organizationId,
        entityType: data.entityType,
        entityId: data.entityId,
        fromState: data.fromState,
        toState: data.toState,
        actorId: data.actorId,
      },
    });
  }
}
