import 'server-only';
import { inboxRepository, type InboxItem } from '../data/inbox.repository';

export async function listInbox(): Promise<InboxItem[]> {
  const rows = await inboxRepository.list();
  return rows.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export async function openInboxCount(): Promise<number> {
  return (await inboxRepository.list()).filter((i) => i.status === 'open').length;
}
