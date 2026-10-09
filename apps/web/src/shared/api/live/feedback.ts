import 'server-only';
import { FeedbackSubjectTypes, type FeedbackCommentDto, type FeedbackSubjectType } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath, unwrapList } from './utils';

function commentsPath(org: string, subjectType: FeedbackSubjectType, subjectId: string): string {
  return orgPath(org, `feedback/subjects/${subjectType}/${subjectId}/comments`);
}

export async function fetchContentComments(contentId: string, tag: string): Promise<FeedbackCommentDto[]> {
  const org = (await getSession())?.orgId ?? '';
  const data = await apiFetch<unknown>(commentsPath(org, FeedbackSubjectTypes.CONTENT, contentId), { tags: [`org:${org}:${tag}`] });
  return unwrapList(data) as unknown as FeedbackCommentDto[];
}

export async function postContentComment(contentId: string, body: string): Promise<void> {
  const org = (await getSession())?.orgId ?? '';
  await apiFetch(commentsPath(org, FeedbackSubjectTypes.CONTENT, contentId), { method: 'POST', body: { body } });
}
