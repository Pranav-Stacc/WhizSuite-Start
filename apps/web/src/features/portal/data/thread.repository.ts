import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';

export interface ThreadMessage extends Entity {
  clientId: string;
  fromClient: boolean;
  authorName: string;
  body: string;
  at: string;
}

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

export const threadRepository = createRepository<ThreadMessage>('thread', () => [
  { id: 'th1', clientId: 'cl-lumen', fromClient: true, authorName: 'Neha Kapoor', body: 'Hi team! Can we move the winter blend reel to Friday evening instead?', at: ago(60 * 26) },
  { id: 'th2', clientId: 'cl-lumen', fromClient: false, authorName: 'Priya Nair', body: 'Absolutely — Friday 6 PM works well for your audience. I will update the schedule today.', at: ago(60 * 25) },
  { id: 'th3', clientId: 'cl-lumen', fromClient: true, authorName: 'Neha Kapoor', body: 'Perfect, thank you! Also loved the latte art challenge results 🙌', at: ago(60 * 4) },
]);
