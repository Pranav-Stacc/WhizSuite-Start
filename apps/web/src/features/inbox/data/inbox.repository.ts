import 'server-only';
import type { Platform } from '@agency-os/contracts';
import { inboxLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';

export const InboxKinds = ['comment', 'dm', 'mention'] as const;
export type InboxKind = (typeof InboxKinds)[number];
export const InboxStatuses = ['open', 'replied', 'archived'] as const;
export type InboxStatus = (typeof InboxStatuses)[number];
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface InboxItem extends Entity {
  clientId: string;
  platform: Platform;
  kind: InboxKind;
  author: string;
  handle: string;
  body: string;
  sentiment: Sentiment;
  status: InboxStatus;
  receivedAt: string;
  reply?: string;
  assigneeId?: string;
}

const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

type Seed = [clientId: string, platform: Platform, kind: InboxKind, author: string, handle: string, body: string, sentiment: Sentiment, minutes: number];

const SEEDS: Seed[] = [
  ['cl-lumen', 'instagram', 'comment', 'Aditi S.', '@aditi.sips', 'Is the winter blend available as whole beans too? 😍', 'positive', 12],
  ['cl-lumen', 'instagram', 'dm', 'Rakesh Menon', '@rakesh_m', 'Hi! My order #4412 arrived with a damaged bag. Can you help?', 'negative', 38],
  ['cl-orbit', 'instagram', 'comment', 'Fit with Zoya', '@fitwithzoya', 'Day 1 done! This challenge is 🔥', 'positive', 55],
  ['cl-orbit', 'youtube', 'comment', 'Karan P.', '@karanp', 'Can you do a beginner version of the leg day routine?', 'neutral', 95],
  ['cl-verde', 'instagram', 'comment', 'Mitali', '@mitali.skin', 'Is this safe for sensitive skin? Mine reacts to everything.', 'neutral', 140],
  ['cl-verde', 'facebook', 'dm', 'Sunita Rao', 'Sunita Rao', 'Where can I buy in Pune? Offline stores?', 'neutral', 210],
  ['cl-nimbus', 'linkedin', 'mention', 'Anika Shah', '@anikashah', 'Tried Nimbus 3.0 today — the preview deploys are a game changer.', 'positive', 260],
  ['cl-nimbus', 'x', 'mention', 'devops_dan', '@devops_dan', 'Docs for the new CLI seem to be missing the auth section?', 'negative', 320],
  ['cl-urban', 'tiktok', 'comment', 'Riya 🌸', '@riyaaa', 'Where can I get that jacket??', 'positive', 400],
  ['cl-lumen', 'facebook', 'comment', 'Vivek K.', 'Vivek K.', 'Loved the latte art challenge! Who won?', 'positive', 520],
];

export const inboxRepository = createRepository<InboxItem>('inbox', () =>
  SEEDS.map(([clientId, platform, kind, author, handle, body, sentiment, minutes], i) => ({
    id: `ib${i + 1}`,
    clientId,
    platform,
    kind,
    author,
    handle,
    body,
    sentiment,
    status: i === 9 ? 'replied' : 'open',
    receivedAt: ago(minutes),
    reply: i === 9 ? 'Congrats to @priya.brews — a month of coffee is on its way! ☕' : undefined,
    assigneeId: i % 3 === 0 ? 'm-meera' : undefined,
  })),
  inboxLive,
);
