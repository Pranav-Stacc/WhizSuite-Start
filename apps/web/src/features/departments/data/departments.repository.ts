import 'server-only';
import { departmentsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface Department extends Entity {
  name: string;
  path: string;
  parentId?: string;
  headcount: number;
  createdAt: string;
}

export const departmentsRepository = createRepository<Department>('departments', () => [
  { id: 'dept-ops', name: 'Operations', path: '/operations', headcount: 3, createdAt: daysFromNow(-400) },
  { id: 'dept-creative', name: 'Creative', path: '/creative', headcount: 4, createdAt: daysFromNow(-380) },
  { id: 'dept-accounts', name: 'Client success', path: '/client-success', parentId: 'dept-ops', headcount: 2, createdAt: daysFromNow(-200) },
], departmentsLive);
