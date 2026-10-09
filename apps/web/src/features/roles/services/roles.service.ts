import 'server-only';
import type { AccessRoleSummary } from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { listMembers } from '@/features/team/services/members.service';
import { rolesRepository, type AgencyRole } from '../data/roles.repository';

/** Demo roles carry no assignment data, so their counts come from the members who hold them. */
async function withDemoMemberCounts(roles: AgencyRole[]): Promise<AgencyRole[]> {
  const counts = new Map<string, number>();
  for (const member of await listMembers()) {
    for (const role of member.roles) counts.set(role.id, (counts.get(role.id) ?? 0) + 1);
  }
  return roles.map((role) => ({ ...role, memberCount: counts.get(role.id) ?? 0 }));
}

export async function listRoles(): Promise<AgencyRole[]> {
  const roles = await rolesRepository.list();
  return isLiveMode ? roles : withDemoMemberCounts(roles);
}

export const getRole = (id: string) => rolesRepository.get(id);

export function toRoleSummary(role: AgencyRole): AccessRoleSummary {
  return {
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
    kind: role.kind,
    defaultScopeTypes: role.defaultScopeTypes,
  };
}
