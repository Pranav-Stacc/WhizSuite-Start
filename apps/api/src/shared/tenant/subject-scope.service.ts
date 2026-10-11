import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  contentMatchesScope,
  projectMatchesScope,
  taskMatchesScope,
  type StaffContentScope,
} from './scope-filters';
import { TenantContext } from './tenant.context';

export interface SubjectRef {
  subjectType: string;
  subjectId: string;
}

export interface EntityRef {
  entityType: string;
  entityId: string;
}

@Injectable()
export class SubjectScopeService {
  constructor(private readonly prisma: PrismaService) {}

  hasRestrictions(): boolean {
    const ctx = TenantContext.get();
    if (!ctx || ctx.membershipType === 'CLIENT') return false;
    return (
      ctx.staffClientIds !== undefined ||
      ctx.staffProjectIds !== undefined ||
      ctx.staffContentIds !== undefined ||
      ctx.staffSelfOnly === true
    );
  }

  contentScope(): StaffContentScope {
    const ctx = TenantContext.get();
    return {
      clientIds: TenantContext.clientScope(),
      projectIds: TenantContext.projectScope(),
      contentIds: TenantContext.contentScope(),
      selfOnly: TenantContext.selfOnly(),
      userId: ctx?.userId,
    };
  }

  async canAccessSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<boolean> {
    if (!this.hasRestrictions()) return true;
    const type = subjectType.toUpperCase().replace(/-/g, '_');
    switch (type) {
      case 'CLIENT':
        return TenantContext.canAccessClient(subjectId);
      case 'CONTENT':
      case 'CONTENT_ITEM':
        return this.canAccessContent(organizationId, subjectId);
      case 'PROJECT':
        return this.canAccessProject(organizationId, subjectId);
      case 'TASK':
        return this.canAccessTask(organizationId, subjectId);
      case 'INVOICE':
        return this.canAccessInvoice(organizationId, subjectId);
      case 'CONTRACT':
        return this.canAccessContract(organizationId, subjectId);
      case 'MEDIA':
      case 'MEDIA_ASSET':
      case 'ASSET':
        return this.canAccessMedia(organizationId, subjectId);
      case 'FOLDER':
      case 'MEDIA_FOLDER':
        return this.canAccessFolder(organizationId, subjectId);
      default:
        return false;
    }
  }

  async canAccessEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    return this.canAccessSubject(organizationId, entityType, entityId);
  }

  async filterSubjects<T extends SubjectRef>(
    organizationId: string,
    items: readonly T[],
  ): Promise<T[]> {
    if (!this.hasRestrictions()) return [...items];
    const kept: T[] = [];
    for (const item of items) {
      if (
        await this.canAccessSubject(
          organizationId,
          item.subjectType,
          item.subjectId,
        )
      ) {
        kept.push(item);
      }
    }
    return kept;
  }

  async filterEntities<T extends EntityRef>(
    organizationId: string,
    items: readonly T[],
  ): Promise<T[]> {
    if (!this.hasRestrictions()) return [...items];
    const kept: T[] = [];
    for (const item of items) {
      if (
        await this.canAccessEntity(
          organizationId,
          item.entityType,
          item.entityId,
        )
      ) {
        kept.push(item);
      }
    }
    return kept;
  }

  async canAccessMetricSnapshot(
    organizationId: string,
    snapshot: {
      channelId: string | null;
      contentVariantId: string | null;
    },
  ): Promise<boolean> {
    if (!this.hasRestrictions()) return true;
    if (snapshot.contentVariantId) {
      const variant = await this.prisma.contentVariant.findFirst({
        where: { id: snapshot.contentVariantId, organizationId },
        select: {
          contentItem: {
            select: {
              id: true,
              clientId: true,
              projectId: true,
              createdById: true,
            },
          },
        },
      });
      if (!variant?.contentItem) return false;
      return contentMatchesScope(variant.contentItem, this.contentScope());
    }
    if (snapshot.channelId) {
      const channel = await this.prisma.socialChannel.findFirst({
        where: { id: snapshot.channelId, organizationId },
        select: { account: { select: { clientId: true } } },
      });
      if (!channel?.account) return false;
      return TenantContext.canAccessClient(channel.account.clientId);
    }
    return false;
  }

  private async canAccessContent(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.contentItem.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        projectId: true,
        createdById: true,
      },
    });
    if (!record) return false;
    return contentMatchesScope(record, this.contentScope());
  }

  private async canAccessProject(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, clientId: true, ownerId: true },
    });
    if (!record) return false;
    return projectMatchesScope(
      record,
      TenantContext.projectScopeFilter() ?? {},
    );
  }

  private async canAccessTask(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.task.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        clientId: true,
        projectId: true,
        createdById: true,
        project: { select: { clientId: true } },
        assignees: { select: { membershipId: true } },
      },
    });
    if (!record) return false;
    return taskMatchesScope(record, TenantContext.taskScope() ?? {});
  }

  private async canAccessInvoice(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      select: { clientId: true },
    });
    return !!record && TenantContext.canAccessClient(record.clientId);
  }

  private async canAccessContract(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.contract.findFirst({
      where: { id, organizationId },
      select: { clientId: true },
    });
    return !!record && TenantContext.canAccessClient(record.clientId);
  }

  private async canAccessMedia(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.mediaAsset.findFirst({
      where: { id, organizationId },
      select: { clientId: true },
    });
    return !!record && TenantContext.canAccessClient(record.clientId);
  }

  private async canAccessFolder(
    organizationId: string,
    id: string,
  ): Promise<boolean> {
    const record = await this.prisma.mediaFolder.findFirst({
      where: { id, organizationId },
      select: { clientId: true },
    });
    return !!record && TenantContext.canAccessClient(record.clientId);
  }
}
