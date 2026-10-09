import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  FeedbackSubjectTypes,
  type FeedbackCommentDto,
  type FeedbackSubjectType,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { SocialService } from '../../../social/application/services/social.service';
import { FeedbackRepository } from '../../infrastructure/repositories/feedback.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { toFeedbackCommentDto } from '../mappers/feedback-comment.mapper';
import type {
  CreateFeedbackThreadDto,
  UpdateFeedbackThreadDto,
} from '../../interface/http/dto/feedback-thread.dto';

export interface FeedbackSubjectRef {
  subjectType: FeedbackSubjectType;
  subjectId: string;
}

@Injectable()
export class FeedbackService {
  constructor(
    private readonly repository: FeedbackRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly social: SocialService,
  ) {}

  /** Client-portal principals may only discuss their own brand or that brand's content. */
  private async assertSubjectAccess(
    organizationId: string,
    subject: FeedbackSubjectRef,
  ): Promise<void> {
    if (!TenantContext.clientScope()) return;
    if (subject.subjectType === FeedbackSubjectTypes.CLIENT) {
      if (!TenantContext.canAccessClient(subject.subjectId)) throw notFound();
      return;
    }
    if (subject.subjectType === FeedbackSubjectTypes.CONTENT) {
      await this.social.getContent(organizationId, subject.subjectId);
      return;
    }
    throw notFound();
  }

  list(organizationId: string) {
    return this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
    );
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) throw notFound();
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateFeedbackThreadDto,
  ) {
    const item = await this.repository.create(organizationId, {
      ...input,
      createdById: actorId,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'feedback/threads.create',
      entityType: 'feedbackThread',
      entityId: item.id,
      after: {
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        status: item.status,
      },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateFeedbackThreadDto,
  ) {
    const before = await this.get(organizationId, id);
    await this.repository.update(organizationId, id, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'feedback/threads.update',
      entityType: 'feedbackThread',
      entityId: id,
      before: { status: before.status, visibility: before.visibility },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }

  /** Conversation on a subject (e.g. a content item's approval thread), oldest first. */
  async listSubjectComments(
    organizationId: string,
    subject: FeedbackSubjectRef,
  ): Promise<FeedbackCommentDto[]> {
    await this.assertSubjectAccess(organizationId, subject);
    const latest = await this.repository.listLatestSubjectComments(
      organizationId,
      subject,
      this.config.get('FEEDBACK_COMMENT_LIST_LIMIT', { infer: true }),
    );
    return latest.reverse().map(toFeedbackCommentDto);
  }

  async addSubjectComment(
    organizationId: string,
    actorId: string,
    subject: FeedbackSubjectRef,
    rawBody: string,
  ): Promise<FeedbackCommentDto> {
    await this.assertSubjectAccess(organizationId, subject);
    const body = rawBody.trim();
    const maxLength = this.config.get('FEEDBACK_COMMENT_MAX_LENGTH', {
      infer: true,
    });
    if (body.length === 0 || body.length > maxLength) {
      throw problem(
        HttpStatus.BAD_REQUEST,
        'Bad Request',
        ErrorCodes.VALIDATION_FAILED,
        `Comment must be between 1 and ${maxLength} characters`,
      );
    }

    const { comment, createdThread } = await this.repository.addSubjectComment(
      organizationId,
      subject,
      actorId,
      body,
    );
    if (createdThread) {
      await this.audit.record({
        organizationId,
        actorId,
        actorType: 'user',
        action: 'feedback/threads.create',
        entityType: 'feedbackThread',
        entityId: createdThread.id,
        after: {
          ...subject,
          status: createdThread.status,
          subjectVersion: createdThread.subjectVersion,
        },
      });
    }
    const dto = toFeedbackCommentDto(comment);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'feedback/comments.create',
      entityType: 'feedbackComment',
      entityId: comment.id,
      after: { ...dto, ...subject },
    });
    return dto;
  }
}
