import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

const LEAD_SELECT = {
  id: true,
  companyName: true,
  brandName: true,
  website: true,
  industry: true,
  source: true,
  ownerId: true,
  estimatedValueMinor: true,
  currency: true,
  customFields: true,
  convertedClientId: true,
  createdAt: true,
  updatedAt: true,
  stage: { select: { name: true } },
} satisfies Prisma.LeadSelect;

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof LEAD_SELECT }>;

export interface PipelineStageRef {
  id: string;
  name: string;
  order: number;
}

export interface PipelineRef {
  id: string;
  stages: PipelineStageRef[];
}

export interface LeadFields {
  companyName?: string;
  brandName?: string | null;
  website?: string | null;
  industry?: string | null;
  source?: string | null;
  ownerId?: string | null;
  estimatedValueMinor?: number | null;
  customFields?: Prisma.InputJsonObject;
  convertedClientId?: string;
  stageId?: string;
}

@Injectable()
export class CrmRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number): Promise<LeadRecord[]> {
    return this.prisma.lead.findMany({
      where: { organizationId },
      select: LEAD_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string): Promise<LeadRecord | null> {
    return this.prisma.lead.findFirst({
      where: { id, organizationId },
      select: LEAD_SELECT,
    });
  }

  create(
    organizationId: string,
    pipelineId: string,
    fields: LeadFields & { companyName: string; stageId: string },
  ): Promise<LeadRecord> {
    return this.prisma.lead.create({
      data: { ...fields, organizationId, pipelineId },
      select: LEAD_SELECT,
    });
  }

  async update(
    organizationId: string,
    id: string,
    fields: LeadFields,
  ): Promise<LeadRecord> {
    await this.prisma.lead.updateMany({
      where: { id, organizationId },
      data: fields,
    });
    return this.prisma.lead.findFirstOrThrow({
      where: { id, organizationId },
      select: LEAD_SELECT,
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.leadActivity.deleteMany({
        where: { organizationId, leadId: id },
      }),
      this.prisma.lead.deleteMany({ where: { id, organizationId } }),
    ]);
  }

  findDefaultPipeline(organizationId: string): Promise<PipelineRef | null> {
    return this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      select: {
        id: true,
        stages: {
          select: { id: true, name: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  createDefaultPipeline(
    organizationId: string,
    name: string,
    stageNames: readonly string[],
  ): Promise<PipelineRef> {
    return this.prisma.pipeline.create({
      data: {
        organizationId,
        name,
        isDefault: true,
        stages: {
          create: stageNames.map((stageName, order) => ({
            organizationId,
            name: stageName,
            order,
          })),
        },
      },
      select: {
        id: true,
        stages: {
          select: { id: true, name: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async addMissingStages(
    organizationId: string,
    pipelineId: string,
    stageNames: readonly string[],
    firstOrder: number,
  ): Promise<void> {
    await this.prisma.pipelineStage.createMany({
      data: stageNames.map((name, index) => ({
        organizationId,
        pipelineId,
        name,
        order: firstOrder + index,
      })),
    });
  }
}
