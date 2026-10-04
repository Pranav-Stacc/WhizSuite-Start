import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';

export type NotificationKind = 'approval' | 'task' | 'mention' | 'invoice' | 'system' | 'lead';

export interface Notification extends Entity {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  at: string;
}

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

type Seed = [userId: string, kind: NotificationKind, title: string, body: string, href: string, minutes: number, read: boolean];

const SEEDS: Seed[] = [
  ['m-aarav', 'approval', 'Content approved', 'Nimbus Cloud approved “Nimbus 3.0 is live”.', '/content/c4', 34, false],
  ['m-aarav', 'invoice', 'Invoice overdue', 'INV-2026-0004 from Verde Skincare is 5 days overdue.', '/invoices/inv4', 180, false],
  ['m-aarav', 'lead', 'Lead moved to negotiation', 'Kalpa Wellness is ready for contract signature.', '/leads', 600, true],
  ['m-priya', 'approval', 'Changes requested', 'Orbit Fitness requested changes on “Transformation Tuesday: Arjun”.', '/content/c8', 95, false],
  ['m-priya', 'task', 'Task overdue', '“Fix off-brand colours in last batch” is overdue.', '/tasks', 220, false],
  ['m-priya', 'mention', 'You were mentioned', 'Meera mentioned you in Urban Threads onboarding.', '/projects/pr-urban-onboard', 400, true],
  ['m-rohan', 'task', 'New task assigned', 'Fix off-brand colours in last batch.', '/tasks', 42, false],
  ['m-rohan', 'approval', 'Client left feedback', 'Verde Skincare commented on “Niacinamide: what it actually does”.', '/content/c10', 120, false],
  ['m-rohan', 'system', 'Welcome to Agency OS', 'Press ⌘K any time to jump anywhere.', '/dashboard', 1500, true],
  ['c-neha', 'approval', '2 posts waiting for you', 'Review and approve “Origin of the bean” and “Winter blend hero reel”.', '/portal/approvals', 20, false],
  ['c-neha', 'invoice', 'New invoice', 'INV-2026-0005 for ₹2,41,900 is ready.', '/portal/invoices', 240, false],
];

export const notificationsRepository = createRepository<Notification>('notifications', () =>
  SEEDS.map(([userId, kind, title, body, href, minutes, read], i) => ({ id: `n${i + 1}`, userId, kind, title, body, href, read, at: ago(minutes) })),
);
