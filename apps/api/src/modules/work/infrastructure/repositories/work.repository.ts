import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

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

  updateProject(organizationId: string, id: string, data: Record<string, unknown>) {
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

  createTask(
    organizationId: string,
    data: {
      projectId: string;
      title: string;
      description?: string;
      type?: string;
      priority: string;
      dueDate?: Date;
      createdById: string;
    },
  ) {
    return this.prisma.task.create({
      data: {
        organizationId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        dueDate: data.dueDate,
        createdById: data.createdById,
        status: 'TODO',
      },
    });
  }

  updateTask(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.task.update({
      where: { id, organizationId },
      data: data as never,
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
