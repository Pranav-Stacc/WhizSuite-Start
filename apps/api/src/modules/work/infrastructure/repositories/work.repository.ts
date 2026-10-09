import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

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
  projectId: string;
  title: string;
  description?: string;
  type?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  estimateMinutes?: number;
  assigneeMembershipId?: string;
  createdById: string;
  calendarItemId?: string;
}

export interface TaskChangeRow {
  projectId?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  estimateMinutes?: number;
  assigneeMembershipId?: string | null;
}

@Injectable()
export class WorkRepository {
  constructor(private readonly prisma: PrismaService) {}

  listProjects(
    organizationId: string,
    limit: number,
    allowedClientIds?: string[],
    allowedProjectIds?: string[],
  ) {
    return this.prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
        ...(allowedProjectIds ? { id: { in: allowedProjectIds } } : {}),
      },
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

  listTasks(organizationId: string, projectId?: string, limit = 100) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { assignees: true },
    });
  }

  /** Open tasks with a due date in range — for the unified calendar feed. */
  listTasksDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds: string[] | undefined,
    limit: number,
  ) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: 'DONE' },
        dueDate: { gte: range.from, lt: range.to },
        ...(clientIds
          ? { project: { clientId: { in: clientIds }, deletedAt: null } }
          : {}),
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        projectId: true,
        project: { select: { clientId: true } },
      },
    });
  }

  /** Project milestones with a due date in range. */
  listMilestonesDueInRange(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds: string[] | undefined,
    limit: number,
  ) {
    return this.prisma.projectMilestone.findMany({
      where: {
        organizationId,
        completedAt: null,
        dueDate: { gte: range.from, lt: range.to },
        ...(clientIds
          ? { project: { clientId: { in: clientIds }, deletedAt: null } }
          : {}),
      },
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
        comments: true,
        dependencies: true,
        children: true,
      },
    });
  }

  createTask(organizationId: string, data: TaskCreateRow) {
    const { assigneeMembershipId, ...fields } = data;
    return this.prisma.task.create({
      data: {
        ...fields,
        organizationId,
        ...(assigneeMembershipId
          ? {
              assignees: {
                create: { organizationId, membershipId: assigneeMembershipId },
              },
            }
          : {}),
      },
      include: { assignees: true },
    });
  }

  /** `assigneeMembershipId`: undefined keeps assignees, null clears them, a value replaces them. */
  updateTask(organizationId: string, id: string, change: TaskChangeRow) {
    const { assigneeMembershipId, ...fields } = change;
    return this.prisma.$transaction(async (tx) => {
      if (assigneeMembershipId !== undefined) {
        await tx.taskAssignee.deleteMany({
          where: { organizationId, taskId: id },
        });
        if (assigneeMembershipId) {
          await tx.taskAssignee.create({
            data: {
              organizationId,
              taskId: id,
              membershipId: assigneeMembershipId,
            },
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
