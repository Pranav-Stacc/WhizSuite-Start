import type { FeedbackComment } from '@prisma/client';
import type { FeedbackCommentDto } from '@agency-os/contracts';

export type FeedbackCommentRecord = Pick<
  FeedbackComment,
  'id' | 'authorId' | 'body' | 'createdAt'
>;

export function toFeedbackCommentDto(
  comment: FeedbackCommentRecord,
): FeedbackCommentDto {
  return {
    id: comment.id,
    authorId: comment.authorId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}
