import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  type FeedbackCommentDto,
  type FeedbackSubjectType,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  problem,
  ProblemDetailsException,
} from '../../../../shared/errors/problem-details.exception';
import { FeedbackRepository } from '../../infrastructure/repositories/feedback.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { toFeedbackCommentDto } from '../mappers/feedback-comment.mapper';

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
  ) {}

  list(organizationId: string) {
    return this.repository.list(organizationId);
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    data: Record<string, unknown>,
  ) {
    const item = await this.repository.create(organizationId, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'feedback/threads.create',
      entityType: 'feedbackThread',
      entityId: (item as { id: string }).id,
      after: item as Record<string, unknown>,
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    await this.get(organizationId, id);
    await this.repository.update(organizationId, id, data);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'feedback/threads.update',
      entityType: 'feedbackThread',
      entityId: id,
      after: data,
    });
    return this.get(organizationId, id);
  }

  /** Conversation on a subject (e.g. a content item's approval thread), oldest first. */
  async listSubjectComments(
    organizationId: string,
    subject: FeedbackSubjectRef,
  ): Promise<FeedbackCommentDto[]> {
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
    const body = rawBody.trim();
    const maxLength = this.config.get('FEEDBACK_COMMENT_MAX_LENGTH', { infer: true });
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
