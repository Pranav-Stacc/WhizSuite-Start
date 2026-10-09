import 'server-only';
import type { Priority, TaskStatus } from '@agency-os/contracts';
import { tasksLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Task extends Entity {
  projectId: string;
  clientId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  dueDate?: string;
  estimateHours?: number;
  createdAt: string;
}

type Seed = [id: string, projectId: string, clientId: string, title: string, status: TaskStatus, priority: Priority, assigneeId: string | undefined, dueInDays: number | undefined, estimate: number];

const SEEDS: Seed[] = [
  ['t1', 'pr-lumen-monthly', 'cl-lumen', 'Design Instagram carousel: “Origin of the bean”', 'IN_PROGRESS', 'HIGH', 'm-rohan', 1, 6],
  ['t2', 'pr-lumen-monthly', 'cl-lumen', 'Write captions for week 41 posts', 'TODO', 'MEDIUM', 'm-sana', 2, 3],
  ['t3', 'pr-lumen-winter', 'cl-lumen', 'Winter blend hero reel — rough cut', 'IN_REVIEW', 'URGENT', 'm-kabir', 0, 8],
  ['t4', 'pr-lumen-winter', 'cl-lumen', 'Shoot-day shot list & moodboard', 'DONE', 'MEDIUM', 'm-rohan', -4, 3],
  ['t5', 'pr-lumen-winter', 'cl-lumen', 'Influencer outreach list (25 creators)', 'TODO', 'LOW', 'm-meera', 6, 4],
  ['t6', 'pr-orbit-30', 'cl-orbit', 'Day 1–7 workout reels (7 videos)', 'IN_PROGRESS', 'URGENT', 'm-kabir', 2, 14],
  ['t7', 'pr-orbit-30', 'cl-orbit', 'Challenge landing page copy', 'IN_REVIEW', 'HIGH', 'm-sana', 1, 4],
  ['t8', 'pr-orbit-30', 'cl-orbit', 'Leaderboard story templates', 'TODO', 'MEDIUM', 'm-rohan', 4, 5],
  ['t9', 'pr-orbit-30', 'cl-orbit', 'Community challenge rules post', 'DONE', 'LOW', 'm-meera', -6, 2],
  ['t10', 'pr-orbit-yt', 'cl-orbit', 'Series format & episode outline', 'TODO', 'MEDIUM', 'm-aarav', 9, 5],
  ['t11', 'pr-verde-ingredients', 'cl-verde', 'Niacinamide explainer carousel', 'IN_REVIEW', 'HIGH', 'm-rohan', 0, 5],
  ['t12', 'pr-verde-ingredients', 'cl-verde', 'Dermatologist Q&A script', 'IN_PROGRESS', 'MEDIUM', 'm-sana', 3, 4],
  ['t13', 'pr-verde-ingredients', 'cl-verde', 'Hyaluronic acid reel storyboard', 'TODO', 'MEDIUM', 'm-kabir', 5, 3],
  ['t14', 'pr-verde-ingredients', 'cl-verde', 'Fix off-brand colours in last batch', 'TODO', 'URGENT', 'm-rohan', -1, 2],
  ['t15', 'pr-nimbus-launch', 'cl-nimbus', 'Launch-day LinkedIn thread', 'IN_PROGRESS', 'URGENT', 'm-sana', 1, 4],
  ['t16', 'pr-nimbus-launch', 'cl-nimbus', 'Product demo video cutdowns', 'IN_PROGRESS', 'HIGH', 'm-kabir', 3, 10],
  ['t17', 'pr-nimbus-launch', 'cl-nimbus', 'Changelog carousel (5 slides)', 'TODO', 'HIGH', 'm-rohan', 4, 5],
  ['t18', 'pr-nimbus-launch', 'cl-nimbus', 'Customer quote cards', 'DONE', 'LOW', 'm-rohan', -3, 3],
  ['t19', 'pr-nimbus-launch', 'cl-nimbus', 'Press kit & founder bio', 'TODO', 'MEDIUM', 'm-priya', 7, 3],
  ['t20', 'pr-urban-onboard', 'cl-urban', 'Brand voice workshop notes', 'DONE', 'MEDIUM', 'm-priya', -5, 3],
  ['t21', 'pr-urban-onboard', 'cl-urban', 'Competitor social audit', 'IN_PROGRESS', 'MEDIUM', 'm-meera', 2, 6],
  ['t22', 'pr-urban-onboard', 'cl-urban', 'First 30-day content calendar', 'TODO', 'HIGH', 'm-priya', 5, 6],
  ['t23', 'pr-urban-onboard', 'cl-urban', 'Connect Instagram & TikTok accounts', 'TODO', 'HIGH', 'm-meera', 1, 1],
  ['t24', 'pr-lumen-monthly', 'cl-lumen', 'Monthly performance report', 'TODO', 'MEDIUM', 'm-priya', 8, 4],
  ['t25', 'pr-orbit-30', 'cl-orbit', 'Respond to community comments', 'TODO', 'LOW', undefined, 2, 2],
];

export const tasksRepository = createRepository<Task>('tasks', () =>
  SEEDS.map(([id, projectId, clientId, title, status, priority, assigneeId, dueInDays, estimateHours]) => ({
    id,
    projectId,
    clientId,
    title,
    description: '',
    status,
    priority,
    assigneeId,
    dueDate: dueInDays === undefined ? undefined : daysFromNow(dueInDays, 17),
    estimateHours,
    createdAt: daysFromNow(-8),
  })),
  tasksLive,
);
