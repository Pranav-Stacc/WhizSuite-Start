import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class SocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  listContent(organizationId: string, clientId?: string, limit = 50) {
    return this.prisma.contentItem.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { variants: true, campaign: true },
    });
  }

  findContent(organizationId: string, id: string) {
    return this.prisma.contentItem.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { variants: { include: { channel: true } }, versions: true },
    });
  }

  createContent(
    organizationId: string,
    data: {
      clientId: string;
      projectId?: string;
      campaignId?: string;
      title: string;
      caption?: string;
      contentType: string;
      createdById: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.contentItem.create({
        data: {
          organizationId,
          clientId: data.clientId,
          projectId: data.projectId,
          campaignId: data.campaignId,
          title: data.title,
          caption: data.caption,
          contentType: data.contentType,
          createdById: data.createdById,
          status: 'DRAFT',
        },
      });
      await tx.contentVersion.create({
        data: {
          organizationId,
          contentItemId: item.id,
          version: 1,
          snapshot: { title: data.title, caption: data.caption },
          createdById: data.createdById,
        },
      });
      return item;
    });
  }

  updateContent(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.contentItem.update({
      where: { id, organizationId },
      data: data as never,
    });
  }

  scheduleVariant(organizationId: string, variantId: string, scheduledAt: Date) {
    return this.prisma.contentVariant.update({
      where: { id: variantId, organizationId },
      data: {
        scheduledAt,
        publishStatus: 'SCHEDULED',
      },
    });
  }

  createPublishJob(organizationId: string, variantId: string, scheduledFor: Date) {
    return this.prisma.publishJob.create({
      data: {
        organizationId,
        variantId,
        scheduledFor,
        status: 'QUEUED',
        idempotencyKey: `publish:${variantId}:${scheduledFor.toISOString()}`,
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
    return this.prisma.entityStateHistory.create({ data });
  }

  listCampaigns(organizationId: string, clientId?: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAccounts(organizationId: string, clientId?: string) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: { channels: true },
    });
  }
}
