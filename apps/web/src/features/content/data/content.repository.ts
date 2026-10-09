import 'server-only';
import type { ContentStatus, ContentType, Platform } from '@agency-os/contracts';
import { contentLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';
import { demoImageUrl } from '@/shared/lib/demo-media';

/** One ordered slide of a post, resolved from the media library. `url` is absent until the asset is ready. */
export interface PostMedia {
  assetId: string;
  name: string;
  mimeType: string;
  url?: string;
}

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
  ctaUrl?: string;
  pillar?: string;
  /** Manual position in the client's grid planner; unset posts fall back to schedule order. */
  gridPosition?: number;
  media: PostMedia[];
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

type Seed = [
  id: string,
  clientId: string,
  title: string,
  caption: string,
  type: ContentType,
  platforms: Platform[],
  status: ContentStatus,
  whenDays: number | undefined,
  authorId: string,
  hashtags: string[],
  pillar: string,
  slides: number,
];

const SEEDS: Seed[] = [
  ['c1', 'cl-lumen', 'Origin of the bean — carousel', 'Every cup has a journey. Swipe to follow our Chikmagalur beans from hillside to your morning ritual ☕', 'CAROUSEL', ['instagram', 'facebook'], 'IN_REVIEW', 2, 'm-rohan', ['#LumenMornings', '#BrewBetter'], 'Education', 4],
  ['c2', 'cl-lumen', 'Winter blend hero reel', 'Meet the blend that tastes like a warm blanket. Winter Blend drops Friday.', 'REEL', ['instagram', 'tiktok'], 'IN_REVIEW', 3, 'm-kabir', ['#WinterBlend'], 'Product', 1],
  ['c3', 'cl-lumen', 'Barista tip: perfect milk foam', 'Three tiny tricks for café-style foam at home.', 'VIDEO', ['instagram', 'tiktok'], 'APPROVED', 4, 'm-meera', ['#BaristaTips'], 'Education', 1],
  ['c4', 'cl-nimbus', 'Nimbus 3.0 is live', 'Nimbus 3.0 is here: 4x faster deploys, zero-config previews, and a brand-new dashboard. Thread 🧵', 'POST', ['linkedin', 'x'], 'APPROVED', 1, 'm-sana', ['#NimbusDev'], 'Product', 1],
  ['c5', 'cl-nimbus', 'Changelog: what shipped in 3.0', 'Five slides. Every feature that matters in this release.', 'CAROUSEL', ['linkedin'], 'DRAFT', undefined, 'm-rohan', ['#CloudNative'], 'Product', 5],
  ['c6', 'cl-orbit', 'Day 1 — 30-day challenge kickoff', 'Day 1. No excuses. Join 2,000 others starting today 💥', 'REEL', ['instagram', 'tiktok', 'youtube'], 'SCHEDULED', 1, 'm-kabir', ['#OrbitStrong', '#MoveDaily'], 'Community', 1],
  ['c7', 'cl-orbit', 'Challenge rules & leaderboard', 'How points work, how to climb the leaderboard, how to win.', 'POST', ['instagram', 'facebook'], 'SCHEDULED', 2, 'm-meera', ['#OrbitStrong'], 'Community', 1],
  ['c8', 'cl-orbit', 'Transformation Tuesday: Arjun', 'Arjun lost 14kg in 12 weeks. Here is his routine.', 'VIDEO', ['youtube', 'instagram'], 'CHANGES_REQUESTED', 5, 'm-kabir', ['#Transformation'], 'Stories', 1],
  ['c9', 'cl-lumen', 'Sunday latte art challenge', 'Show us your best latte art and win a month of free coffee.', 'POST', ['instagram', 'facebook'], 'PUBLISHED', -2, 'm-meera', ['#LumenMornings'], 'Community', 1],
  ['c10', 'cl-verde', 'Niacinamide: what it actually does', 'Myth vs. fact on skincare’s most talked-about ingredient.', 'CAROUSEL', ['instagram', 'facebook'], 'IN_REVIEW', 1, 'm-rohan', ['#VerdeGlow', '#CleanSkin'], 'Education', 3],
  ['c11', 'cl-verde', 'Ask a dermatologist: Q&A', 'Dr. Mehra answers your most-asked questions.', 'VIDEO', ['youtube', 'instagram'], 'DRAFT', undefined, 'm-sana', ['#CleanSkin'], 'Education', 0],
  ['c12', 'cl-verde', 'Evening routine in 60 seconds', 'Cleanse. Treat. Hydrate. Done.', 'REEL', ['instagram'], 'PUBLISHED', -4, 'm-kabir', ['#VerdeGlow'], 'Product', 1],
  ['c13', 'cl-urban', 'Autumn drop lookbook', 'The autumn edit is here. Layers, textures, and a little attitude.', 'CAROUSEL', ['instagram', 'tiktok'], 'DRAFT', 6, 'm-rohan', ['#UrbanThreads', '#StreetEdit'], 'Product', 4],
  ['c14', 'cl-nimbus', 'Customer story: Fyndr cut deploy time 70%', 'How Fyndr’s platform team shipped faster with Nimbus.', 'ARTICLE', ['linkedin'], 'PUBLISHED', -6, 'm-sana', ['#NimbusDev'], 'Stories', 1],
  ['c15', 'cl-lumen', 'Cold brew season story set', 'Quick story set for the weekend cold brew promo.', 'STORY', ['instagram', 'facebook'], 'SCHEDULED', 0, 'm-meera', ['#ColdBrew'], 'Product', 2],
  ['c16', 'cl-lumen', 'Meet the roaster: Anil', 'Twenty years, one obsession. Meet the hands behind every roast.', 'POST', ['instagram'], 'DRAFT', 7, 'm-rohan', ['#LumenMornings'], 'Stories', 1],
  ['c17', 'cl-lumen', 'Pour-over in five steps', 'Slow coffee, done right. Save this for your next weekend brew.', 'CAROUSEL', ['instagram'], 'CHANGES_REQUESTED', 9, 'm-meera', ['#BrewBetter'], 'Education', 5],
  ['c18', 'cl-lumen', 'Café playlist drop', 'What we are spinning at the café this month.', 'POST', ['instagram', 'facebook'], 'PUBLISHED', -8, 'm-kabir', ['#LumenMornings'], 'Community', 1],
];

const DEMO_SLIDE_MIME_TYPE = 'image/jpeg';
const DEMO_HOUR_BASE = 10;
const DEMO_HOUR_SPREAD = 7;

function demoSlides(postId: string, count: number): PostMedia[] {
  return Array.from({ length: count }, (_, index) => {
    const assetId = `${postId}-s${index + 1}`;
    return { assetId, name: `${assetId}.jpg`, mimeType: DEMO_SLIDE_MIME_TYPE, url: demoImageUrl(assetId) };
  });
}

export const contentRepository = createRepository<Post>(
  'content',
  () =>
    SEEDS.map(([id, clientId, title, caption, contentType, platforms, status, whenDays, authorId, hashtags, pillar, slides]) => ({
      id,
      clientId,
      title,
      caption,
      contentType,
      platforms,
      status,
      scheduledAt: whenDays === undefined ? undefined : daysFromNow(whenDays, DEMO_HOUR_BASE + (Number(id.slice(1)) % DEMO_HOUR_SPREAD)),
      authorId,
      hashtags,
      pillar,
      media: demoSlides(id, slides),
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
  { id: 'ce4', contentId: 'c17', kind: 'changes', actorName: 'Ananya Sen', body: 'Can we swap slide 3 for the darker roast shot? And shorten the caption a little.', at: daysFromNow(-1, 11) },
  { id: 'ce5', contentId: 'c17', kind: 'comment', actorName: 'Meera Joshi', body: 'On it — updated version coming this afternoon.', at: daysFromNow(-1, 12) },
]);
