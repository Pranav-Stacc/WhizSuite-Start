import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { rolesLive } from '@/shared/api/live/bindings';
import { createRepository, type Entity } from '@/shared/data/repository';

export interface AgencyRole extends Entity {
  name: string;
  description: string;
  isSystem: boolean;
  permissionKeys: string[];
  memberCount: number;
}

export const rolesRepository = createRepository<AgencyRole>('roles', () => [
  {
    id: 'role-owner',
    name: 'Owner',
    description: 'Full access to everything in the agency.',
    isSystem: true,
    permissionKeys: Object.values(Permissions),
    memberCount: 1,
  },
  {
    id: 'role-manager',
    name: 'Account manager',
    description: 'Runs clients, reports, team and approvals.',
    isSystem: true,
    permissionKeys: [
      Permissions.CLIENTS_VIEW,
      Permissions.CLIENTS_CREATE,
      Permissions.CLIENTS_EDIT,
      Permissions.LEADS_VIEW,
      Permissions.LEADS_CREATE,
      Permissions.PROJECTS_VIEW,
      Permissions.PROJECTS_CREATE,
      Permissions.TASKS_VIEW,
      Permissions.TASKS_CREATE,
      Permissions.CONTENT_VIEW,
      Permissions.CONTENT_CREATE,
      Permissions.APPROVALS_VIEW,
      Permissions.APPROVALS_APPROVE,
      Permissions.REPORTS_VIEW,
      Permissions.MEMBERS_VIEW,
      Permissions.MEMBERS_INVITE,
    ],
    memberCount: 1,
  },
  {
    id: 'role-creator',
    name: 'Creator',
    description: 'Works on tasks, content and time tracking.',
    isSystem: true,
    permissionKeys: [
      Permissions.TASKS_VIEW,
      Permissions.TASKS_CREATE,
      Permissions.TASKS_EDIT,
      Permissions.CONTENT_VIEW,
      Permissions.CONTENT_CREATE,
      Permissions.CONTENT_EDIT,
      Permissions.TIME_TRACK,
      Permissions.FILES_VIEW,
      Permissions.FILES_UPLOAD,
    ],
    memberCount: 4,
  },
], rolesLive);
