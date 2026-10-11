import 'server-only';
import { Permissions } from '@agency-os/contracts';
import { can } from '@/shared/auth/permissions';
import { listClients } from '@/features/clients/services/clients.service';
import { listDepartments } from '@/features/departments/services/departments.service';
import { listRoles } from '@/features/roles/services/roles.service';
import { listMembers } from '@/features/team/services/members.service';

import type { SetupProgress, SetupStep } from '../types';

export async function getSetupProgress(): Promise<SetupProgress | null> {
  const mayManage = await can(Permissions.ORG_SETTINGS_MANAGE);
  if (!mayManage) return null;

  const [roles, departments, clients, members] = await Promise.all([
    listRoles().catch(() => []),
    listDepartments().catch(() => []),
    listClients().catch(() => []),
    listMembers().catch(() => []),
  ]);

  const customRoles = roles.some((role) => !role.isSystem);
  const activeMembers = members.filter((m) => m.status === 'ACTIVE');

  const steps: SetupStep[] = [
    {
      id: 'roles',
      done: customRoles || roles.length > 1,
      href: '/roles',
      tourTarget: 'setup-roles',
    },
    {
      id: 'departments',
      done: departments.length > 0,
      href: '/departments',
      tourTarget: 'setup-departments',
    },
    {
      id: 'client',
      done: clients.length > 0,
      href: '/clients?new=1',
      tourTarget: 'setup-client',
    },
    {
      id: 'invite',
      done: activeMembers.length > 1 || members.some((m) => m.status === 'INVITED'),
      href: '/team?invite=1',
      tourTarget: 'setup-invite',
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  return {
    steps,
    completed,
    total: steps.length,
    complete: completed === steps.length,
  };
}
