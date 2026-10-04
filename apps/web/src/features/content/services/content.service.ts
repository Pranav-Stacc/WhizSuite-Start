import 'server-only';
import { contentEventsRepository, contentRepository, type ContentEvent, type Post } from '../data/content.repository';

export async function listContent(): Promise<Post[]> {
  return contentRepository.list();
}

export async function getPost(id: string): Promise<Post | undefined> {
  return contentRepository.get(id);
}

export async function pendingApprovals(): Promise<Post[]> {
  return (await listContent()).filter((p) => p.status === 'IN_REVIEW');
}

export async function eventsFor(contentId: string): Promise<ContentEvent[]> {
  const all = await contentEventsRepository.list();
  return all.filter((e) => e.contentId === contentId).sort((a, b) => a.at.localeCompare(b.at));
}

export async function allEvents(): Promise<ContentEvent[]> {
  return contentEventsRepository.list();
}
