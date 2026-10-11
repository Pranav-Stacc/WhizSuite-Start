import {
  readPermissionScopeResources,
  readPermissionScopeTypes,
  ScopeTypes,
} from '@agency-os/contracts';
import type { PrismaService } from '../../../../shared/database/prisma.service';

export interface ResolvedDataScope {
  orgWide: boolean;
  selfOnly: boolean;
  clientIds: string[];
  projectIds: string[];
  contentIds: string[];
}

type ScopeRow = {
  scopeType: string;
  resourceId: string | null;
};

export interface PermissionScopeRule {
  key: string;
  /** `null` keeps legacy behaviour: every assignment scope applies to this permission. */
  scopeTypes: readonly string[] | null;
}

/**
 * Assignment scopes that actually grant the given permissions.
 * A content grant limited to CLIENT ignores an ORGANIZATION scope on the same assignment.
 * When `prefixes` is set, only permissions in those modules are considered.
 */
export function scopesApplicableToPermissions(
  scopes: readonly ScopeRow[],
  permissions: readonly PermissionScopeRule[],
  prefixes?: readonly string[],
): ScopeRow[] {
  const relevant = prefixes
    ? permissions.filter((permission) =>
        prefixes.some(
          (prefix) =>
            permission.key === prefix ||
            permission.key.startsWith(`${prefix}.`),
        ),
      )
    : [...permissions];
  if (relevant.length === 0) return [];
  if (relevant.some((permission) => permission.scopeTypes === null)) {
    return [...scopes];
  }
  const allowed = new Set(
    relevant.flatMap((permission) => permission.scopeTypes ?? []),
  );
  return scopes.filter((scope) => allowed.has(scope.scopeType));
}

function dedupeScopeRows(scopes: readonly ScopeRow[]): ScopeRow[] {
  const seen = new Set<string>();
  const out: ScopeRow[] = [];
  for (const scope of scopes) {
    const key = `${scope.scopeType}:${scope.resourceId ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(scope);
  }
  return out;
}

export interface RolePermissionScopeSource {
  key: string;
  conditions: unknown;
}

/**
 * Merges assignment scopes with resource ids stored on role permissions (`conditions.resources`).
 * Role-level client/project bindings apply even when the assignment only has an org-wide scope row.
 */
export function compileDataScopeRows(
  assignmentScopes: readonly ScopeRow[],
  permissions: readonly RolePermissionScopeSource[],
  prefixes?: readonly string[],
): ScopeRow[] {
  const relevant = prefixes
    ? permissions.filter((permission) =>
        prefixes.some(
          (prefix) =>
            permission.key === prefix ||
            permission.key.startsWith(`${prefix}.`),
        ),
      )
    : [...permissions];
  if (relevant.length === 0) return [];

  const permissionRules: PermissionScopeRule[] = relevant.map((permission) => ({
    key: permission.key,
    scopeTypes: readPermissionScopeTypes(permission.conditions),
  }));

  const resourceRows: ScopeRow[] = [];
  for (const permission of relevant) {
    const resources = readPermissionScopeResources(permission.conditions);
    for (const [scopeType, resourceIds] of Object.entries(resources)) {
      for (const resourceId of resourceIds ?? []) {
        resourceRows.push({ scopeType, resourceId });
      }
    }
  }

  const effectiveAssignmentScopes =
    assignmentScopes.length === 0
      ? [{ scopeType: ScopeTypes.ORGANIZATION, resourceId: null }]
      : [...assignmentScopes];

  const fromAssignment = scopesApplicableToPermissions(
    effectiveAssignmentScopes,
    permissionRules,
    prefixes,
  );
  const fromRoleResources = scopesApplicableToPermissions(
    dedupeScopeRows(resourceRows),
    permissionRules,
    prefixes,
  );

  if (fromRoleResources.length > 0) {
    const assignmentNarrowing = fromAssignment.filter(
      (scope) => scope.scopeType !== ScopeTypes.ORGANIZATION,
    );
    return dedupeScopeRows([...fromRoleResources, ...assignmentNarrowing]);
  }

  return fromAssignment;
}

async function membershipIdsInDepartment(
  prisma: PrismaService,
  organizationId: string,
  departmentId: string,
): Promise<string[]> {
  const designations = await prisma.designation.findMany({
    where: { organizationId, departmentId },
    select: { id: true },
  });
  if (designations.length === 0) return [];
  const rows = await prisma.memberDesignation.findMany({
    where: {
      organizationId,
      designationId: { in: designations.map((row) => row.id) },
    },
    select: { membershipId: true },
  });
  return [...new Set(rows.map((row) => row.membershipId))];
}

async function membershipIdsInTeam(
  prisma: PrismaService,
  organizationId: string,
  teamId: string,
): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { organizationId, teamId },
    select: { membershipId: true },
  });
  return rows.map((row) => row.membershipId);
}

async function departmentIdsForMembership(
  prisma: PrismaService,
  organizationId: string,
  membershipId: string,
): Promise<string[]> {
  const rows = await prisma.memberDesignation.findMany({
    where: { organizationId, membershipId },
    select: { designationId: true },
  });
  if (rows.length === 0) return [];
  const designations = await prisma.designation.findMany({
    where: {
      organizationId,
      id: { in: rows.map((row) => row.designationId) },
    },
    select: { departmentId: true },
  });
  return [...new Set(designations.map((row) => row.departmentId))];
}

async function teamIdsForMembership(
  prisma: PrismaService,
  organizationId: string,
  membershipId: string,
): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { organizationId, membershipId },
    select: { teamId: true },
  });
  return rows.map((row) => row.teamId);
}

async function userIdsForMemberships(
  prisma: PrismaService,
  organizationId: string,
  membershipIds: string[],
): Promise<string[]> {
  if (membershipIds.length === 0) return [];
  const rows = await prisma.organizationMembership.findMany({
    where: { organizationId, id: { in: membershipIds }, status: 'ACTIVE' },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

async function expandMembershipWork(
  prisma: PrismaService,
  organizationId: string,
  membershipIds: string[],
  userIds: string[],
  clientIds: Set<string>,
  projectIds: Set<string>,
): Promise<void> {
  if (membershipIds.length === 0) return;

  const assignments = await prisma.clientAssignment.findMany({
    where: { organizationId, membershipId: { in: membershipIds } },
    select: { clientId: true },
  });
  for (const row of assignments) clientIds.add(row.clientId);

  if (userIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ownerId: { in: userIds },
      },
      select: { id: true, clientId: true },
    });
    for (const project of projects) {
      projectIds.add(project.id);
      clientIds.add(project.clientId);
    }
  }

  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      deletedAt: null,
      assignees: { some: { membershipId: { in: membershipIds } } },
    },
    select: {
      clientId: true,
      projectId: true,
      project: { select: { clientId: true } },
    },
  });
  for (const task of tasks) {
    if (task.clientId) clientIds.add(task.clientId);
    if (task.projectId) projectIds.add(task.projectId);
    if (task.project?.clientId) clientIds.add(task.project.clientId);
  }
}

async function expandDepartment(
  prisma: PrismaService,
  organizationId: string,
  departmentId: string,
  clientIds: Set<string>,
  projectIds: Set<string>,
): Promise<void> {
  const membershipIds = await membershipIdsInDepartment(
    prisma,
    organizationId,
    departmentId,
  );
  const userIds = await userIdsForMemberships(
    prisma,
    organizationId,
    membershipIds,
  );
  await expandMembershipWork(
    prisma,
    organizationId,
    membershipIds,
    userIds,
    clientIds,
    projectIds,
  );
}

async function expandTeam(
  prisma: PrismaService,
  organizationId: string,
  teamId: string,
  clientIds: Set<string>,
  projectIds: Set<string>,
): Promise<void> {
  const membershipIds = await membershipIdsInTeam(
    prisma,
    organizationId,
    teamId,
  );
  const userIds = await userIdsForMemberships(
    prisma,
    organizationId,
    membershipIds,
  );

  const teamClients = await prisma.clientAssignment.findMany({
    where: { organizationId, teamId },
    select: { clientId: true },
  });
  for (const row of teamClients) clientIds.add(row.clientId);

  await expandMembershipWork(
    prisma,
    organizationId,
    membershipIds,
    userIds,
    clientIds,
    projectIds,
  );
}

/**
 * Compiles role-assignment scopes into list filters for staff.
 * Org-wide grants clear restrictions; otherwise union CLIENT/PROJECT/CONTENT ids
 * plus department/team/self expansions.
 */
export async function resolveDataScopeFromAssignments(
  prisma: PrismaService,
  organizationId: string,
  membershipId: string,
  assignments: ReadonlyArray<{ scopes: ScopeRow[] }>,
): Promise<ResolvedDataScope> {
  let orgWide = assignments.length === 0;
  let selfOnly = false;
  const clientIds = new Set<string>();
  const projectIds = new Set<string>();
  const contentIds = new Set<string>();
  const departmentIds = new Set<string>();
  const teamIds = new Set<string>();
  let useActorDepartments = false;
  let useActorTeams = false;
  let hasNarrowingScope = false;

  for (const assignment of assignments) {
    if (assignment.scopes.length === 0) {
      orgWide = true;
      continue;
    }
    for (const scope of assignment.scopes) {
      switch (scope.scopeType) {
        case ScopeTypes.ORGANIZATION:
        case ScopeTypes.WORKSPACE:
          orgWide = true;
          break;
        case ScopeTypes.SELF:
          selfOnly = true;
          hasNarrowingScope = true;
          break;
        case ScopeTypes.DEPARTMENT:
          hasNarrowingScope = true;
          if (scope.resourceId) departmentIds.add(scope.resourceId);
          else useActorDepartments = true;
          break;
        case ScopeTypes.TEAM:
          hasNarrowingScope = true;
          if (scope.resourceId) teamIds.add(scope.resourceId);
          else useActorTeams = true;
          break;
        case ScopeTypes.CLIENT:
          hasNarrowingScope = true;
          if (scope.resourceId) clientIds.add(scope.resourceId);
          else orgWide = true;
          break;
        case ScopeTypes.PROJECT:
          hasNarrowingScope = true;
          if (scope.resourceId) projectIds.add(scope.resourceId);
          else orgWide = true;
          break;
        case ScopeTypes.CONTENT:
          hasNarrowingScope = true;
          if (scope.resourceId) contentIds.add(scope.resourceId);
          else orgWide = true;
          break;
        default:
          if (scope.resourceId) {
            if (scope.scopeType === ScopeTypes.TASK) {
              // Task ids do not narrow list filters; handled per-resource.
            }
          } else {
            orgWide = true;
          }
      }
    }
  }

  if (orgWide) {
    return {
      orgWide: true,
      selfOnly: false,
      clientIds: [],
      projectIds: [],
      contentIds: [],
    };
  }

  if (useActorDepartments) {
    for (const departmentId of await departmentIdsForMembership(
      prisma,
      organizationId,
      membershipId,
    )) {
      departmentIds.add(departmentId);
    }
  }
  for (const departmentId of departmentIds) {
    await expandDepartment(
      prisma,
      organizationId,
      departmentId,
      clientIds,
      projectIds,
    );
  }

  if (useActorTeams) {
    for (const teamId of await teamIdsForMembership(
      prisma,
      organizationId,
      membershipId,
    )) {
      teamIds.add(teamId);
    }
  }
  for (const teamId of teamIds) {
    await expandTeam(prisma, organizationId, teamId, clientIds, projectIds);
  }

  if (projectIds.size > 0) {
    const projects = await prisma.project.findMany({
      where: { organizationId, id: { in: [...projectIds] } },
      select: { clientId: true },
    });
    for (const project of projects) clientIds.add(project.clientId);
  }

  if (contentIds.size > 0) {
    const items = await prisma.contentItem.findMany({
      where: { organizationId, id: { in: [...contentIds] }, deletedAt: null },
      select: { clientId: true, projectId: true },
    });
    for (const item of items) {
      clientIds.add(item.clientId);
      if (item.projectId) projectIds.add(item.projectId);
    }
  }

  const hasResourceScope =
    clientIds.size > 0 || projectIds.size > 0 || contentIds.size > 0;

  if (!selfOnly && !hasResourceScope) {
    return {
      orgWide: !hasNarrowingScope,
      selfOnly: false,
      clientIds: [],
      projectIds: [],
      contentIds: [],
    };
  }

  return {
    orgWide: false,
    selfOnly,
    clientIds: [...clientIds],
    projectIds: [...projectIds],
    contentIds: [...contentIds],
  };
}
