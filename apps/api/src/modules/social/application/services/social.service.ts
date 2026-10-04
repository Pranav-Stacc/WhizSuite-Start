import { Injectable } from '@nestjs/common';
import { DomainEventTypes, ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { SocialRepository } from '../../infrastructure/repositories/social.repository';

@Injectable()
export class SocialService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  listContent(organizationId: string, clientId?: string) {
    return this.repository.listContent(organizationId, clientId);
  }

  async getContent(organizationId: string, id: string) {
    const item = await this.repository.findContent(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return item;
  }

  async createContent(
    organizationId: string,
    actorId: string,
    data: {
      clientId: string;
      projectId?: string;
      campaignId?: string;
      title: string;
      caption?: string;
      contentType: string;
    },
  ) {
    const item = await this.repository.createContent(organizationId, {
      ...data,
      createdById: actorId,
    });
    await this.outbox.write({
      type: DomainEventTypes.CONTENT_CREATED,
      version: 1,
      organizationId,
      payload: { contentId: item.id, clientId: item.clientId },
      actor: { id: actorId, type: 'user' },
    });
    return item;
  }

  async transitionContent(
    organizationId: string,
    actorId: string,
    contentId: string,
    toStatus: string,
  ) {
    const item = await this.getContent(organizationId, contentId);
    const updated = await this.repository.updateContent(organizationId, contentId, {
      status: toStatus,
    });
    await this.repository.recordStateHistory({
      organizationId,
      entityType: 'CONTENT',
      entityId: contentId,
      fromState: item.status,
      toState: toStatus,
      actorId,
    });
    await this.outbox.write({
      type: DomainEventTypes.CONTENT_STATE_CHANGED,
      version: 1,
      organizationId,
      payload: { contentId, fromStatus: item.status, toStatus },
      actor: { id: actorId, type: 'user' },
    });
    return updated;
  }

  async scheduleVariant(
    organizationId: string,
    actorId: string,
    variantId: string,
    scheduledAt: string,
  ) {
    const variant = await this.repository.scheduleVariant(
      organizationId,
      variantId,
      new Date(scheduledAt),
    );
    await this.repository.createPublishJob(organizationId, variantId, new Date(scheduledAt));
    await this.outbox.write({
      type: DomainEventTypes.CONTENT_SCHEDULED,
      version: 1,
      organizationId,
      payload: { variantId, scheduledAt },
      actor: { id: actorId, type: 'user' },
    });
    return variant;
  }

  listCampaigns(organizationId: string, clientId?: string) {
    return this.repository.listCampaigns(organizationId, clientId);
  }

  listAccounts(organizationId: string, clientId?: string) {
    return this.repository.listAccounts(organizationId, clientId);
  }
}
