import 'server-only';
import type { ContentStatus, ContentType, Platform } from '@agency-os/contracts';
import { contentLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Post extends Entity {
  clientId: string;
  title: string;
  caption: string;
  contentType: ContentType;
  platforms: Platform[];
  status: ContentStatus;
  scheduledAt?: string;
  authorId: string;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type ContentEventKind = 'comment' | 'submitted' | 'approved' | 'changes' | 'rejected' | 'scheduled' | 'published';

export interface ContentEvent extends Entity {
  contentId: string;
  kind: ContentEventKind;
  actorName: string;
  body: string;
  at: string;
}

type Seed = [id: string, clientId: string, title: string, caption: string, type: ContentType, platforms: Platform[], status: ContentStatus, whenDays: number | undefined, authorId: string, hashtags: string[]];

const SEEDS: Seed[] = [
  ['c1', 'cl-lumen', 'Origin of the bean — carousel', 'Every cup has a journey. Swipe to follow our Chikmagalur beans from hillside to your morning ritual ☕', 'CAROUSEL', ['instagram', 'facebook'], 'IN_REVIEW', 2, 'm-rohan', ['#LumenMornings', '#BrewBetter']],
  ['c2', 'cl-lumen', 'Winter blend hero reel', 'Meet the blend that tastes like a warm blanket. Winter Blend drops Friday.', 'REEL', ['instagram', 'tiktok'], 'IN_REVIEW', 3, 'm-kabir', ['#WinterBlend']],
  ['c3', 'cl-lumen', 'Barista tip: perfect milk foam', 'Three tiny tricks for café-style foam at home.', 'VIDEO', ['instagram', 'tiktok'], 'APPROVED', 4, 'm-meera', ['#BaristaTips']],
  ['c4', 'cl-nimbus', 'Nimbus 3.0 is live', 'Nimbus 3.0 is here: 4x faster deploys, zero-config previews, and a brand-new dashboard. Thread 🧵', 'POST', ['linkedin', 'x'], 'APPROVED', 1, 'm-sana', ['#NimbusDev']],
  ['c5', 'cl-nimbus', 'Changelog: what shipped in 3.0', 'Five slides. Every feature that matters in this release.', 'CAROUSEL', ['linkedin'], 'DRAFT', undefined, 'm-rohan', ['#CloudNative']],
  ['c6', 'cl-orbit', 'Day 1 — 30-day challenge kickoff', 'Day 1. No excuses. Join 2,000 others starting today 💥', 'REEL', ['instagram', 'tiktok', 'youtube'], 'SCHEDULED', 1, 'm-kabir', ['#OrbitStrong', '#MoveDaily']],
  ['c7', 'cl-orbit', 'Challenge rules & leaderboard', 'How points work, how to climb the leaderboard, how to win.', 'POST', ['instagram', 'facebook'], 'SCHEDULED', 2, 'm-meera', ['#OrbitStrong']],
  ['c8', 'cl-orbit', 'Transformation Tuesday: Arjun', 'Arjun lost 14kg in 12 weeks. Here is his routine.', 'VIDEO', ['youtube', 'instagram'], 'CHANGES_REQUESTED', 5, 'm-kabir', ['#Transformation']],
  ['c9', 'cl-lumen', 'Sunday latte art challenge', 'Show us your best latte art and win a month of free coffee.', 'POST', ['instagram', 'facebook'], 'PUBLISHED', -2, 'm-meera', ['#LumenMornings']],
  ['c10', 'cl-verde', 'Niacinamide: what it actually does', 'Myth vs. fact on skincare’s most talked-about ingredient.', 'CAROUSEL', ['instagram', 'facebook'], 'IN_REVIEW', 1, 'm-rohan', ['#VerdeGlow', '#CleanSkin']],
  ['c11', 'cl-verde', 'Ask a dermatologist: Q&A', 'Dr. Mehra answers your most-asked questions.', 'VIDEO', ['youtube', 'instagram'], 'DRAFT', undefined, 'm-sana', ['#CleanSkin']],
  ['c12', 'cl-verde', 'Evening routine in 60 seconds', 'Cleanse. Treat. Hydrate. Done.', 'REEL', ['instagram'], 'PUBLISHED', -4, 'm-kabir', ['#VerdeGlow']],
  ['c13', 'cl-urban', 'Autumn drop lookbook', 'The autumn edit is here. Layers, textures, and a little attitude.', 'CAROUSEL', ['instagram', 'tiktok'], 'DRAFT', 6, 'm-rohan', ['#UrbanThreads', '#StreetEdit']],
  ['c14', 'cl-nimbus', 'Customer story: Fyndr cut deploy time 70%', 'How Fyndr’s platform team shipped faster with Nimbus.', 'ARTICLE', ['linkedin'], 'PUBLISHED', -6, 'm-sana', ['#NimbusDev']],
  ['c15', 'cl-lumen', 'Cold brew season story set', 'Quick story set for the weekend cold brew promo.', 'STORY', ['instagram', 'facebook'], 'SCHEDULED', 0, 'm-meera', ['#ColdBrew']],
];

export const contentRepository = createRepository<Post>('content', () =>
  SEEDS.map(([id, clientId, title, caption, contentType, platforms, status, whenDays, authorId, hashtags]) => ({
    id,
    clientId,
    title,
    caption,
    contentType,
    platforms,
    status,
    scheduledAt: whenDays === undefined ? undefined : daysFromNow(whenDays, 10 + (Number(id.slice(1)) % 7)),
    authorId,
    hashtags,
    createdAt: daysFromNow(-9),
    updatedAt: daysFromNow(-1),
    version: 1,
  })),
  contentLive,
);

export const contentEventsRepository = createRepository<ContentEvent>('content-events', () => [
  { id: 'ce1', contentId: 'c8', kind: 'changes', actorName: 'Vikram Rao', body: 'Love the story, but please use the new logo lockup and soften the intro music.', at: daysFromNow(-1, 14) },
  { id: 'ce2', contentId: 'c1', kind: 'submitted', actorName: 'Rohan Das', body: 'Ready for client review.', at: daysFromNow(0, 9) },
  { id: 'ce3', contentId: 'c4', kind: 'approved', actorName: 'Rahul Verma', body: 'Approved — ship it!', at: daysFromNow(-1, 16) },
]);
