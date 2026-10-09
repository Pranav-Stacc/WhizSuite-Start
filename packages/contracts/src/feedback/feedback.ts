import { z } from 'zod';

export const FeedbackSubjectTypes = {
  CONTENT: 'CONTENT',
  /** The agency ↔ client conversation shown in the client portal. */
  CLIENT: 'CLIENT',
} as const;
export type FeedbackSubjectType = (typeof FeedbackSubjectTypes)[keyof typeof FeedbackSubjectTypes];
export const FEEDBACK_SUBJECT_TYPE_VALUES = Object.values(FeedbackSubjectTypes);

/** Defaults for the server-configurable FEEDBACK_COMMENT_MAX_LENGTH / FEEDBACK_COMMENT_LIST_LIMIT. */
export const FEEDBACK_COMMENT_MAX_LENGTH_DEFAULT = 2000;
export const FEEDBACK_COMMENT_LIST_LIMIT_DEFAULT = 500;

export const feedbackCommentCreateSchema = z.object({
  body: z.string().trim().min(1).max(FEEDBACK_COMMENT_MAX_LENGTH_DEFAULT),
});
export type FeedbackCommentCreateInput = z.infer<typeof feedbackCommentCreateSchema>;

export type FeedbackCommentDto = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
};
