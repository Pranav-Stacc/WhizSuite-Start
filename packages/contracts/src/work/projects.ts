import type { ProjectStatus } from '../domain/statuses.js';

export const PROJECT_NAME_MAX_LENGTH = 200;
export const PROJECT_TYPE_MAX_LENGTH = 60;
export const PROJECT_LIST_LIMIT_DEFAULT = 200;

export interface ProjectCreateInput {
  clientId: string;
  name: string;
  type?: string;
  status?: ProjectStatus;
  /** YYYY-MM-DD */
  startDate?: string;
  endDate?: string;
  budgetMinor?: number;
  ownerUserId?: string;
}

export type ProjectUpdateInput = Partial<Omit<ProjectCreateInput, 'clientId'>>;

export interface ProjectDto {
  id: string;
  clientId: string;
  workspaceId: string;
  name: string;
  type: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  budgetMinor: number | null;
  currency: string;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
