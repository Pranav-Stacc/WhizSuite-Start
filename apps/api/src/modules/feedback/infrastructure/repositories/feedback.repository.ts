import { Injectable } from '@nestjs/common';
import type { FeedbackThread } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import type { FeedbackCommentRecord } from '../../application/mappers/feedback-comment.mapper';

const OPEN_THREAD_STATUS = 'OPEN';
const DEFAULT_SUBJECT_VERSION = '1';

const COMMENT_SELECT = {
  id: true,
  authorId: true,
  body: true,
  createdAt: true,
} as const;

export interface FeedbackSubject {
  subjectType: string;
  subjectId: string;
}

export interface SubjectCommentResult {
  comment: FeedbackCommentRecord;
  /** Set only when this call opened a new thread for the subject. */
  createdThread: FeedbackThread | null;
}

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.feedbackThread.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.feedbackThread.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.feedbackThread.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.feedbackThread.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }

  /** Newest `limit` comments across every thread of the subject, newest first. */
  listLatestSubjectComments(
    organizationId: string,
    subject: FeedbackSubject,
    limit: number,
  ): Promise<FeedbackCommentRecord[]> {
    return this.prisma.feedbackComment.findMany({
      where: {
        organizationId,
        thread: {
          organizationId,
          subjectType: subject.subjectType,
          subjectId: subject.subjectId,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: COMMENT_SELECT,
    });
  }

  /** Appends to the subject's OPEN thread, opening one if needed; serialized per subject so only one thread is opened. */
  addSubjectComment(
    organizationId: string,
    subject: FeedbackSubject,
    authorId: string,
    body: string,
  ): Promise<SubjectCommentResult> {
    const lockKey = `feedback:${organizationId}:${subject.subjectType}:${subject.subjectId}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const existing = await tx.feedbackThread.findFirst({
        where: { organizationId, ...subject, status: OPEN_THREAD_STATUS },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      let createdThread: FeedbackThread | null = null;
      let threadId = existing?.id;
      if (!threadId) {
        createdThread = await tx.feedbackThread.create({
          data: {
            organizationId,
            ...subject,
            subjectVersion: DEFAULT_SUBJECT_VERSION,
            status: OPEN_THREAD_STATUS,
            createdById: authorId,
          },
        });
        threadId = createdThread.id;
      }
      const comment = await tx.feedbackComment.create({
        data: { organizationId, threadId, authorId, body },
        select: COMMENT_SELECT,
      });
      return { comment, createdThread };
    });
  }
}
