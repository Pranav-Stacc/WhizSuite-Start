import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

const asJson = (value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined =>
  value as Prisma.InputJsonValue | undefined;

@Injectable()
export class AgentRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(organizationId: string, userId: string, title?: string) {
    return this.prisma.agentSession.create({
      data: { organizationId, userId, title },
    });
  }

  findSession(organizationId: string, id: string) {
    return this.prisma.agentSession.findFirst({
      where: { id, organizationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
    });
  }

  listSessions(organizationId: string, userId: string, limit: number) {
    return this.prisma.agentSession.findMany({
      where: { organizationId, userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  addMessage(
    organizationId: string,
    sessionId: string,
    role: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.agentMessage.create({
      data: {
        organizationId,
        sessionId,
        role,
        content,
        metadata: asJson(metadata),
      },
    });
  }

  touchSession(sessionId: string, title?: string) {
    return this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date(), ...(title ? { title } : {}) },
    });
  }

  createRun(data: {
    organizationId: string;
    sessionId: string;
    userId: string;
    prompt: string;
    agentDefinitionId?: string;
    scheduleId?: string;
    multiAgent?: boolean;
  }) {
    return this.prisma.agentRun.create({
      data: {
        organizationId: data.organizationId,
        sessionId: data.sessionId,
        userId: data.userId,
        prompt: data.prompt,
        agentDefinitionId: data.agentDefinitionId,
        scheduleId: data.scheduleId,
        multiAgent: data.multiAgent ?? false,
        status: 'QUEUED',
      },
    });
  }

  updateRun(
    id: string,
    data: Partial<{
      status: string;
      response: string;
      error: string;
      startedAt: Date;
      completedAt: Date;
    }>,
  ) {
    return this.prisma.agentRun.update({ where: { id }, data });
  }

  findRun(organizationId: string, id: string) {
    return this.prisma.agentRun.findFirst({
      where: { id, organizationId },
      include: { steps: { orderBy: { startedAt: 'asc' } }, pendingActions: true },
    });
  }

  listRuns(organizationId: string, userId: string, limit: number) {
    return this.prisma.agentRun.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  createRunStep(data: {
    organizationId: string;
    runId: string;
    agentName: string;
    stepType: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    status?: string;
    error?: string;
  }) {
    return this.prisma.agentRunStep.create({
      data: {
        organizationId: data.organizationId,
        runId: data.runId,
        agentName: data.agentName,
        stepType: data.stepType,
        input: asJson(data.input),
        output: asJson(data.output),
        status: data.status ?? 'RUNNING',
        error: data.error,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  createPendingAction(data: {
    organizationId: string;
    runId: string;
    userId: string;
    toolId: string;
    input: Record<string, unknown>;
    summary: string;
    expiresAt: Date;
  }) {
    return this.prisma.agentPendingAction.create({
      data: {
        ...data,
        input: data.input as Prisma.InputJsonValue,
      },
    });
  }

  findPendingAction(organizationId: string, id: string) {
    return this.prisma.agentPendingAction.findFirst({
      where: { id, organizationId },
    });
  }

  listPendingActions(organizationId: string, userId: string) {
    return this.prisma.agentPendingAction.findMany({
      where: { organizationId, userId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  resolvePendingAction(id: string, status: 'CONFIRMED' | 'REJECTED') {
    return this.prisma.agentPendingAction.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });
  }

  createDefinition(data: {
    organizationId: string;
    createdById: string;
    name: string;
    description?: string;
    systemPrompt: string;
    toolIds: string[];
    subAgents: Array<{ name: string; role: string }>;
  }) {
    return this.prisma.agentDefinition.create({
      data: {
        organizationId: data.organizationId,
        createdById: data.createdById,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        toolIds: data.toolIds,
        subAgents: data.subAgents,
      },
    });
  }

  listDefinitions(organizationId: string) {
    return this.prisma.agentDefinition.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDefinition(organizationId: string, id: string) {
    return this.prisma.agentDefinition.findFirst({
      where: { id, organizationId, isActive: true },
    });
  }

  createSchedule(data: {
    organizationId: string;
    createdById: string;
    name: string;
    prompt: string;
    cron: string;
    timezone: string;
    agentDefinitionId?: string;
    nextRunAt?: Date;
  }) {
    return this.prisma.agentSchedule.create({ data });
  }

  listSchedules(organizationId: string) {
    return this.prisma.agentSchedule.findMany({
      where: { organizationId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findSchedule(organizationId: string, id: string) {
    return this.prisma.agentSchedule.findFirst({
      where: { id, organizationId },
    });
  }

  updateSchedule(
    id: string,
    data: Partial<{
      name: string;
      prompt: string;
      cron: string;
      timezone: string;
      status: string;
      lastRunAt: Date;
      nextRunAt: Date;
    }>,
  ) {
    return this.prisma.agentSchedule.update({ where: { id }, data });
  }

  listDueSchedules(now: Date, limit: number) {
    return this.prisma.agentSchedule.findMany({
      where: {
        status: 'ACTIVE',
        nextRunAt: { lte: now },
      },
      take: limit,
    });
  }
}
