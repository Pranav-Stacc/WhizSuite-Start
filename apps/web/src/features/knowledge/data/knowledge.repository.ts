import 'server-only';
import type { ArticleCategory } from '@agency-os/contracts';
import { knowledgeLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Article extends Entity {
  title: string;
  category: ArticleCategory;
  body: string;
  authorId: string;
  updatedAt: string;
}

export const knowledgeRepository = createRepository<Article>('knowledge', () => [
  {
    id: 'kb1',
    title: 'Client onboarding checklist',
    category: 'ONBOARDING',
    body: 'Kick off every new client the same way.\n\nCollect brand assets, logins and goals in the first call.\nConnect social accounts under Integrations.\nCreate the first project and a 30-day content calendar.\nInvite the client contact to the portal so they can approve content.',
    authorId: 'm-priya',
    updatedAt: daysFromNow(-6),
  },
  {
    id: 'kb2',
    title: 'Content approval SOP',
    category: 'SOP',
    body: 'Every post goes through the same path.\n\nDraft → Internal review → Client approval → Scheduled → Published.\nNever schedule a post that has not been approved by the client contact.\nIf changes are requested, respond within one business day.',
    authorId: 'm-aarav',
    updatedAt: daysFromNow(-14),
  },
  {
    id: 'kb3',
    title: 'Crisis response playbook',
    category: 'PLAYBOOK',
    body: 'When a negative comment goes viral.\n\nPause all scheduled content for the affected client.\nNotify the account owner within 15 minutes.\nDraft a response using the client’s brand voice and get it approved by the client.\nLog the incident in the audit trail.',
    authorId: 'm-aarav',
    updatedAt: daysFromNow(-30),
  },
  {
    id: 'kb4',
    title: 'Monthly report template',
    category: 'TEMPLATE',
    body: 'Structure for the monthly client report.\n\nHeadline results: reach, engagement rate, follower growth.\nTop three posts and why they worked.\nWhat we learned and what we will change next month.\nOne clear recommendation for the next quarter.',
    authorId: 'm-priya',
    updatedAt: daysFromNow(-9),
  },
  {
    id: 'kb5',
    title: 'Remote work & availability policy',
    category: 'POLICY',
    body: 'Core hours are 11:00–16:00 IST.\n\nUpdate your status when you are out.\nRespond to client messages within four business hours.\nUrgent issues go in the team channel with a tag.',
    authorId: 'm-aarav',
    updatedAt: daysFromNow(-90),
  },
], knowledgeLive);
