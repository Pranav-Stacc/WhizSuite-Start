import 'server-only';
import { workflowsLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';

export interface WorkflowStage {
  name: string;
  /** @deprecated Prefer roleIds; kept for older stage configs. */
  assigneeRoleId?: string | null;
  approvalRule?: 'ANY' | 'ALL' | 'QUORUM';
  quorumCount?: number;
  approverIds?: string[];
  roleIds?: string[];
  /** Which list `targetIds` refers to. */
  basis?: 'PERSON' | 'ROLE' | 'DESIGNATION' | 'DEPARTMENT' | 'CLIENT' | 'CLIENT_CONTACT' | 'PROJECT' | 'ASSIGNEE';
  targetIds?: string[];
  scopeType?: string;
  scopeResourceId?: string | null;
}

export interface Workflow extends Entity {
  name: string;
  /** content | task | project | custom */
  entityType: string;
  /** ORGANIZATION, or CLIENT when limited to one account. */
  scopeType: string;
  scopeId?: string | null;
  stages: WorkflowStage[];
  requiresClientApproval: boolean;
  slaHours: number;
  active: boolean;
}

export const workflowsRepository = createRepository<Workflow>('workflows', () => [
  {
    id: 'wf1',
    name: 'Standard content approval',
    entityType: 'content',
    scopeType: 'ORGANIZATION',
    stages: [
      { name: 'Draft' },
      { name: 'Internal review' },
      { name: 'Client approval' },
      { name: 'Scheduled' },
      { name: 'Published' },
    ],
    requiresClientApproval: true,
    slaHours: 48,
    active: true,
  },
  {
    id: 'wf2',
    name: 'Fast-track (internal only)',
    entityType: 'content',
    scopeType: 'ORGANIZATION',
    stages: [
      { name: 'Draft' },
      { name: 'Internal review' },
      { name: 'Scheduled' },
      { name: 'Published' },
    ],
    requiresClientApproval: false,
    slaHours: 12,
    active: true,
  },
  {
    id: 'wf3',
    name: 'Video production',
    entityType: 'content',
    scopeType: 'ORGANIZATION',
    stages: [
      { name: 'Brief' },
      { name: 'Script' },
      { name: 'Edit' },
      { name: 'Client approval' },
      { name: 'Published' },
    ],
    requiresClientApproval: true,
    slaHours: 96,
    active: false,
  },
], workflowsLive);
