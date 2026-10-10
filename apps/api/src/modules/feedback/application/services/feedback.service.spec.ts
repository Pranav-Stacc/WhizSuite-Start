import type { ConfigService } from '@nestjs/config';
import { ErrorCodes, FeedbackSubjectTypes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import type { OutboxService } from '../../../../shared/events/outbox.service';
import type { AuditService } from '../../../audit/application/services/audit.service';
import type { SocialService } from '../../../social/application/services/social.service';
import type { FeedbackRepository } from '../../infrastructure/repositories/feedback.repository';
import { FeedbackService } from './feedback.service';

const ORG = '00000000-0000-4000-8000-000000000001';
const ACTOR = '00000000-0000-4000-8000-000000000002';
const SUBJECT_ID = '00000000-0000-4000-8000-000000000003';
const THREAD_ID = '00000000-0000-4000-8000-000000000004';
const MAX_LENGTH = 10;
const SUBJECT = {
  subjectType: FeedbackSubjectTypes.CONTENT,
  subjectId: SUBJECT_ID,
};

const configValues: Partial<Record<keyof AppConfig, unknown>> = {
  FEEDBACK_COMMENT_MAX_LENGTH: MAX_LENGTH,
  FEEDBACK_COMMENT_LIST_LIMIT: 500,
};

function comment(id: string, createdAt: string) {
  return {
    id,
    authorId: ACTOR,
    body: `comment ${id}`,
    createdAt: new Date(createdAt),
  };
}

function setup() {
  const repository = {
    listLatestSubjectComments: jest.fn().mockResolvedValue([]),
    addSubjectComment: jest.fn(),
  };
  const outbox = { write: jest.fn().mockResolvedValue(undefined) };
  const audit = { record: jest.fn() };
  const config = { get: (key: keyof AppConfig) => configValues[key] };
  const social = {
    getContent: jest.fn().mockResolvedValue({
      id: SUBJECT_ID,
      title: 'Post',
      createdById: '00000000-0000-4000-8000-000000000099',
    }),
  };
  const subjectScope = {
    canAccessSubject: jest.fn().mockResolvedValue(true),
    filterSubjects: jest.fn().mockImplementation(async (_org, items) => items),
  };
  const service = new FeedbackService(
    repository as unknown as FeedbackRepository,
    outbox as unknown as OutboxService,
    audit as unknown as AuditService,
    config as unknown as ConfigService<AppConfig, true>,
    social as unknown as SocialService,
    subjectScope as never,
  );
  return { service, repository, audit, social, outbox };
}

describe('FeedbackService subject comments', () => {
  it('lists comments oldest first', async () => {
    const { service, repository } = setup();
    repository.listLatestSubjectComments.mockResolvedValue([
      comment('2', '2026-01-02T00:00:00Z'),
      comment('1', '2026-01-01T00:00:00Z'),
    ]);
    const result = await service.listSubjectComments(ORG, SUBJECT);
    expect(repository.listLatestSubjectComments).toHaveBeenCalledWith(
      ORG,
      SUBJECT,
      500,
    );
    expect(result).toEqual([
      {
        id: '1',
        authorId: ACTOR,
        body: 'comment 1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        authorId: ACTOR,
        body: 'comment 2',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('rejects bodies longer than the configured maximum', async () => {
    const { service, repository } = setup();
    const error = await service
      .addSubjectComment(ORG, ACTOR, SUBJECT, 'x'.repeat(MAX_LENGTH + 1))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect((error as ProblemDetailsException).problem.code).toBe(
      ErrorCodes.VALIDATION_FAILED,
    );
    expect(repository.addSubjectComment).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only bodies', async () => {
    const { service, repository } = setup();
    await expect(
      service.addSubjectComment(ORG, ACTOR, SUBJECT, '   '),
    ).rejects.toBeInstanceOf(ProblemDetailsException);
    expect(repository.addSubjectComment).not.toHaveBeenCalled();
  });

  it('audits both the opened thread and the comment when the subject had no open thread', async () => {
    const { service, repository, audit } = setup();
    repository.addSubjectComment.mockResolvedValue({
      comment: comment('c1', '2026-01-01T00:00:00Z'),
      createdThread: { id: THREAD_ID, status: 'OPEN', subjectVersion: '1' },
    });
    const result = await service.addSubjectComment(
      ORG,
      ACTOR,
      SUBJECT,
      '  Looks good ',
    );
    expect(repository.addSubjectComment).toHaveBeenCalledWith(
      ORG,
      SUBJECT,
      ACTOR,
      'Looks good',
    );
    expect(result).toEqual({
      id: 'c1',
      authorId: ACTOR,
      body: 'comment c1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feedback/threads.create',
        entityId: THREAD_ID,
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'feedback/comments.create',
        entityId: 'c1',
      }),
    );
  });

  it('only audits the comment when appending to an existing thread', async () => {
    const { service, repository, audit } = setup();
    repository.addSubjectComment.mockResolvedValue({
      comment: comment('c2', '2026-01-01T00:00:00Z'),
      createdThread: null,
    });
    await service.addSubjectComment(ORG, ACTOR, SUBJECT, 'Approved');
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'feedback/comments.create' }),
    );
  });
});
