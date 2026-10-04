import 'server-only';
import { createRepository, type Entity } from '@/shared/data/repository';

export interface Workflow extends Entity {
  name: string;
  stages: string[];
  requiresClientApproval: boolean;
  slaHours: number;
  active: boolean;
}

export const workflowsRepository = createRepository<Workflow>('workflows', () => [
  { id: 'wf1', name: 'Standard content approval', stages: ['Draft', 'Internal review', 'Client approval', 'Scheduled', 'Published'], requiresClientApproval: true, slaHours: 48, active: true },
  { id: 'wf2', name: 'Fast-track (internal only)', stages: ['Draft', 'Internal review', 'Scheduled', 'Published'], requiresClientApproval: false, slaHours: 12, active: true },
  { id: 'wf3', name: 'Video production', stages: ['Brief', 'Script', 'Edit', 'Client approval', 'Published'], requiresClientApproval: true, slaHours: 96, active: false },
]);
