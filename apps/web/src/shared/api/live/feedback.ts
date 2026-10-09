import 'server-only';
import { FeedbackSubjectTypes, type FeedbackCommentDto, type FeedbackSubjectType } from '@agency-os/contracts';
import { apiFetch } from '@/shared/api/api-client';
import { getSession } from '@/shared/auth/session';
import { orgPath, unwrapList } from './utils';

function commentsPath(org: string, subjectType: FeedbackSubjectType, subjectId: string): string {
  return orgPath(org, `feedback/subjects/${subjectType}/${subjectId}/comments`);
}

async function fetchComments(subjectType: FeedbackSubjectType, subjectId: string, tag: string): Promise<FeedbackCommentDto[]> {
  const org = (await getSession())?.orgId ?? '';
  const data = await apiFetch<unknown>(commentsPath(org, subjectType, subjectId), { tags: [`org:${org}:${tag}`] });
  return unwrapList(data) as unknown as FeedbackCommentDto[];
}

async function postComment(subjectType: FeedbackSubjectType, subjectId: string, body: string): Promise<FeedbackCommentDto> {
  const org = (await getSession())?.orgId ?? '';
  return apiFetch<FeedbackCommentDto>(commentsPath(org, subjectType, subjectId), { method: 'POST', body: { body } });
}

export function fetchContentComments(contentId: string, tag: string): Promise<FeedbackCommentDto[]> {
  return fetchComments(FeedbackSubjectTypes.CONTENT, contentId, tag);
}

export async function postContentComment(contentId: string, body: string): Promise<void> {
  await postComment(FeedbackSubjectTypes.CONTENT, contentId, body);
}

/** The client portal conversation between the agency and one client. */
export function fetchClientThread(clientId: string, tag: string): Promise<FeedbackCommentDto[]> {
  return fetchComments(FeedbackSubjectTypes.CLIENT, clientId, tag);
}

export function postClientThreadMessage(clientId: string, body: string): Promise<FeedbackCommentDto> {
  return postComment(FeedbackSubjectTypes.CLIENT, clientId, body);
}
