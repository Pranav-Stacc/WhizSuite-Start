import 'server-only';
import { isLiveMode } from '@/shared/config/env';
import { fetchContentComments, postContentComment } from '@/shared/api/live/feedback';
import { memberDirectory } from '@/features/team/services/members.service';
import { contentEventsRepository, contentRepository, type ContentEvent, type ContentEventKind, type Post } from '../data/content.repository';

const CONTENT_CACHE_TAG = 'content';
/** Event kinds that carry a human message and therefore belong in the live conversation thread. */
const CONVERSATION_KINDS: ReadonlySet<ContentEventKind> = new Set(['comment', 'changes', 'rejected']);

export async function listContent(): Promise<Post[]> {
  return contentRepository.list();
}

export async function listClientContent(clientId: string): Promise<Post[]> {
  return (await listContent()).filter((p) => p.clientId === clientId);
}

export async function getPost(id: string): Promise<Post | undefined> {
  return contentRepository.get(id);
}

export async function pendingApprovals(): Promise<Post[]> {
  return (await listContent()).filter((p) => p.status === 'IN_REVIEW');
}

async function liveEventsFor(contentId: string, names: Map<string, string>): Promise<ContentEvent[]> {
  const comments = await fetchContentComments(contentId, CONTENT_CACHE_TAG);
  return comments.map((c) => ({ id: c.id, contentId, kind: 'comment', actorName: names.get(c.authorId) ?? '', body: c.body, at: c.createdAt }));
}

async function memberNames(): Promise<Map<string, string>> {
  return new Map([...(await memberDirectory())].map(([id, entry]) => [id, entry.name]));
}

const byTime = (a: ContentEvent, b: ContentEvent) => a.at.localeCompare(b.at);

export async function eventsFor(contentId: string): Promise<ContentEvent[]> {
  if (isLiveMode) return (await liveEventsFor(contentId, await memberNames())).sort(byTime);
  const all = await contentEventsRepository.list();
  return all.filter((e) => e.contentId === contentId).sort(byTime);
}

/** Conversation threads for several posts at once, keyed by content id. */
export async function eventsForMany(contentIds: string[]): Promise<Map<string, ContentEvent[]>> {
  const result = new Map<string, ContentEvent[]>(contentIds.map((id) => [id, []]));
  if (isLiveMode) {
    const names = await memberNames();
    const threads = await Promise.all(contentIds.map((id) => liveEventsFor(id, names)));
    contentIds.forEach((id, i) => result.set(id, threads[i].sort(byTime)));
    return result;
  }
  for (const event of (await contentEventsRepository.list()).sort(byTime)) result.get(event.contentId)?.push(event);
  return result;
}

export async function allEvents(): Promise<ContentEvent[]> {
  return contentEventsRepository.list();
}

/** Appends to a post's timeline; in live mode only messages are persisted (status history lives in the audit log). */
export async function recordContentEvent(contentId: string, kind: ContentEventKind, actorName: string, body: string): Promise<void> {
  if (isLiveMode) {
    if (CONVERSATION_KINDS.has(kind)) await postContentComment(contentId, body);
    return;
  }
  await contentEventsRepository.create({ contentId, kind, actorName, body, at: new Date().toISOString() });
}
