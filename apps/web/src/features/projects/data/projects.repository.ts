import 'server-only';
import type { ProjectStatus } from '@agency-os/contracts';
import { projectsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Project extends Entity {
  clientId: string;
  name: string;
  type: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  budgetMinor: number;
  ownerId: string;
}

const rupees = (value: number): number => value * 100;

export const projectsRepository = createRepository<Project>('projects', () => [
  { id: 'pr-lumen-monthly', clientId: 'cl-lumen', name: 'Monthly social retainer', type: 'Retainer', status: 'ACTIVE', startDate: daysFromNow(-90), endDate: daysFromNow(60), budgetMinor: rupees(255000), ownerId: 'm-priya' },
  { id: 'pr-lumen-winter', clientId: 'cl-lumen', name: 'Winter blend launch', type: 'Campaign', status: 'ACTIVE', startDate: daysFromNow(-20), endDate: daysFromNow(25), budgetMinor: rupees(120000), ownerId: 'm-priya' },
  { id: 'pr-orbit-30', clientId: 'cl-orbit', name: '30-day challenge campaign', type: 'Campaign', status: 'ACTIVE', startDate: daysFromNow(-14), endDate: daysFromNow(16), budgetMinor: rupees(240000), ownerId: 'm-priya' },
  { id: 'pr-orbit-yt', clientId: 'cl-orbit', name: 'YouTube workout series', type: 'Video', status: 'PLANNING', startDate: daysFromNow(7), endDate: daysFromNow(70), budgetMinor: rupees(180000), ownerId: 'm-aarav' },
  { id: 'pr-verde-ingredients', clientId: 'cl-verde', name: 'Ingredient spotlight series', type: 'Content series', status: 'ACTIVE', startDate: daysFromNow(-30), endDate: daysFromNow(30), budgetMinor: rupees(190000), ownerId: 'm-aarav' },
  { id: 'pr-nimbus-launch', clientId: 'cl-nimbus', name: 'Nimbus 3.0 launch', type: 'Product launch', status: 'ACTIVE', startDate: daysFromNow(-25), endDate: daysFromNow(12), budgetMinor: rupees(450000), ownerId: 'm-aarav' },
  { id: 'pr-urban-onboard', clientId: 'cl-urban', name: 'Brand onboarding & audit', type: 'Onboarding', status: 'ACTIVE', startDate: daysFromNow(-10), endDate: daysFromNow(18), budgetMinor: rupees(60000), ownerId: 'm-priya' },
  { id: 'pr-atlas-q3', clientId: 'cl-atlas', name: 'Q3 listings push', type: 'Campaign', status: 'ON_HOLD', startDate: daysFromNow(-60), endDate: daysFromNow(-5), budgetMinor: rupees(210000), ownerId: 'm-aarav' },
], projectsLive);
