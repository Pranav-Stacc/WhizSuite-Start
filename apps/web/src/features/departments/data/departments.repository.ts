import 'server-only';
import { departmentsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';
import { daysFromNow } from '@/shared/lib/format';

export interface DepartmentDesignation {
  id: string;
  name: string;
  isHead: boolean;
  memberCount: number;
}

export interface Department extends Entity {
  name: string;
  path: string;
  parentId?: string;
  headcount: number;
  designations: DepartmentDesignation[];
  createdAt: string;
}

export const departmentsRepository = createRepository<Department>('departments', () => [
  { id: 'dept-ops', name: 'Operations', path: '/operations', headcount: 3, designations: [], createdAt: daysFromNow(-400) },
  { id: 'dept-creative', name: 'Creative', path: '/creative', headcount: 4, designations: [], createdAt: daysFromNow(-380) },
  { id: 'dept-accounts', name: 'Client success', path: '/client-success', parentId: 'dept-ops', headcount: 2, designations: [], createdAt: daysFromNow(-200) },
], departmentsLive);
