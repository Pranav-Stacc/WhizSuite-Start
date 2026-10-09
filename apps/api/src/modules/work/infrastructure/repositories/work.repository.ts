import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

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

  listProjects(organizationId: string, limit = 50) {
    return this.prisma.project.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { tasks: { where: { deletedAt: null }, take: 5 } },
    });
  }

  findProject(organizationId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null } },
        milestones: true,
        members: true,
      },
    });
  }

  createProject(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.project.create({
      data: { ...data, organizationId } as never,
    });
  }

  updateProject(
    organizationId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    return this.prisma.project.updateMany({
      where: { id, organizationId },
      data: data as never,
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
