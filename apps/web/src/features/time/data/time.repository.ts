import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow, toDateKey } from '@/shared/lib/format';

export interface TimeEntry extends Entity {
  userId: string;
  projectId: string;
  clientId: string;
  taskId?: string;
  minutes: number;
  date: string;
  note: string;
  billable: boolean;
}

export interface ActiveTimer extends Entity {
  userId: string;
  taskId: string;
  projectId: string;
  clientId: string;
  startedAt: string;
}

type Seed = [userId: string, projectId: string, clientId: string, minutes: number, dayOffset: number, note: string];

const SEEDS: Seed[] = [
  ['m-rohan', 'pr-lumen-monthly', 'cl-lumen', 240, -1, 'Carousel layout & colour pass'],
  ['m-rohan', 'pr-verde-ingredients', 'cl-verde', 180, -1, 'Niacinamide slides'],
  ['m-rohan', 'pr-nimbus-launch', 'cl-nimbus', 300, -2, 'Quote cards'],
  ['m-rohan', 'pr-lumen-winter', 'cl-lumen', 150, -3, 'Moodboard'],
  ['m-rohan', 'pr-orbit-30', 'cl-orbit', 210, 0, 'Story templates'],
  ['m-kabir', 'pr-orbit-30', 'cl-orbit', 420, -1, 'Workout reels edit'],
  ['m-kabir', 'pr-lumen-winter', 'cl-lumen', 360, -2, 'Hero reel rough cut'],
  ['m-sana', 'pr-nimbus-launch', 'cl-nimbus', 200, -1, 'Launch thread draft'],
  ['m-sana', 'pr-orbit-30', 'cl-orbit', 120, -2, 'Landing copy'],
  ['m-meera', 'pr-urban-onboard', 'cl-urban', 180, -1, 'Competitor audit'],
  ['m-priya', 'pr-urban-onboard', 'cl-urban', 150, -3, 'Voice workshop'],
  ['m-aarav', 'pr-orbit-yt', 'cl-orbit', 90, -2, 'Series planning'],
];

export const timeRepository = createRepository<TimeEntry>('time', () =>
  SEEDS.map(([userId, projectId, clientId, minutes, dayOffset, note], i) => ({
    id: `te${i + 1}`,
    userId,
    projectId,
    clientId,
    minutes,
    date: toDateKey(daysFromNow(dayOffset)),
    note,
    billable: true,
  })),
);

export const timersRepository = createRepository<ActiveTimer>('timers', () => []);
