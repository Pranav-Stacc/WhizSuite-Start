import type { Prisma } from '@prisma/client';

export interface StaffTaskScope {
  clientIds?: string[];
  projectIds?: string[];
  selfOnly?: boolean;
  membershipId?: string;
  userId?: string;
}

export interface StaffProjectScope {
  clientIds?: string[];
  projectIds?: string[];
  selfOnly?: boolean;
  userId?: string;
}

function selfTaskFilter(
  membershipId: string,
  userId: string,
): Prisma.TaskWhereInput {
  return {
    OR: [{ createdById: userId }, { assignees: { some: { membershipId } } }],
  };
}

function clientTaskFilter(clientIds: string[]): Prisma.TaskWhereInput {
  return {
    OR: [
      { clientId: { in: clientIds } },
      {
        project: {
          clientId: { in: clientIds },
          deletedAt: null,
        },
      },
    ],
  };
}

function projectTaskFilter(projectIds: string[]): Prisma.TaskWhereInput {
  return { projectId: { in: projectIds } };
}

/** Merges tenant list filters for task queries (client / project / self scopes). */
export function taskListWhere(
  base: Prisma.TaskWhereInput,
  scope: StaffTaskScope,
): Prisma.TaskWhereInput {
  const parts: Prisma.TaskWhereInput[] = [base];
  if (scope.clientIds?.length) parts.push(clientTaskFilter(scope.clientIds));
  if (scope.projectIds?.length) parts.push(projectTaskFilter(scope.projectIds));
  if (scope.selfOnly && scope.membershipId && scope.userId) {
    parts.push(selfTaskFilter(scope.membershipId, scope.userId));
  }
  return parts.length === 1 ? base : { AND: parts };
}

function selfProjectFilter(userId: string): Prisma.ProjectWhereInput {
  return { ownerId: userId };
}

/** Merges tenant list filters for project queries. */
export function projectListWhere(
  base: Prisma.ProjectWhereInput,
  scope: StaffProjectScope,
): Prisma.ProjectWhereInput {
  const parts: Prisma.ProjectWhereInput[] = [base];
  if (scope.clientIds?.length) {
    parts.push({ clientId: { in: scope.clientIds } });
  }
  if (scope.projectIds?.length) {
    parts.push({ id: { in: scope.projectIds } });
  }
  if (scope.selfOnly && scope.userId) {
    parts.push(selfProjectFilter(scope.userId));
  }
  return parts.length === 1 ? base : { AND: parts };
}

export function taskMatchesScope(
  task: {
    clientId: string | null;
    projectId: string | null;
    createdById: string | null;
    project?: { clientId: string } | null;
    assignees?: { membershipId: string }[];
  },
  scope: StaffTaskScope,
): boolean {
  if (scope.clientIds?.length) {
    const clientId = task.clientId ?? task.project?.clientId ?? null;
    if (!clientId || !scope.clientIds.includes(clientId)) return false;
  }
  if (scope.projectIds?.length) {
    if (!task.projectId || !scope.projectIds.includes(task.projectId)) {
      return false;
    }
  }
  if (scope.selfOnly && scope.membershipId && scope.userId) {
    const assigned =
      task.assignees?.some((a) => a.membershipId === scope.membershipId) ??
      false;
    if (task.createdById !== scope.userId && !assigned) return false;
  }
  return true;
}

export function projectMatchesScope(
  project: { id: string; clientId: string; ownerId: string | null },
  scope: StaffProjectScope,
): boolean {
  if (scope.clientIds?.length && !scope.clientIds.includes(project.clientId)) {
    return false;
  }
  if (scope.projectIds?.length && !scope.projectIds.includes(project.id)) {
    return false;
  }
  if (scope.selfOnly && scope.userId && project.ownerId !== scope.userId) {
    return false;
  }
  return true;
}

export interface StaffContentScope {
  clientIds?: string[];
  projectIds?: string[];
  contentIds?: string[];
  selfOnly?: boolean;
  userId?: string;
}

export function contentMatchesScope(
  content: {
    id: string;
    clientId: string;
    projectId: string | null;
    createdById: string | null;
  },
  scope: StaffContentScope,
): boolean {
  if (scope.contentIds?.length && !scope.contentIds.includes(content.id)) {
    return false;
  }
  if (scope.clientIds?.length && !scope.clientIds.includes(content.clientId)) {
    return false;
  }
  if (scope.projectIds?.length) {
    if (!content.projectId || !scope.projectIds.includes(content.projectId)) {
      return false;
    }
  }
  if (scope.selfOnly && scope.userId && content.createdById !== scope.userId) {
    return false;
  }
  return true;
}

export interface StaffLeadScope {
  selfOnly?: boolean;
  userId?: string;
  clientIds?: string[];
}

export function leadListWhere(
  base: Prisma.LeadWhereInput,
  scope: StaffLeadScope,
): Prisma.LeadWhereInput {
  const filters: Prisma.LeadWhereInput[] = [];
  if (scope.selfOnly && scope.userId) {
    filters.push({ ownerId: scope.userId });
  }
  if (scope.clientIds?.length) {
    filters.push({ convertedClientId: { in: scope.clientIds } });
  }
  if (filters.length === 0) return base;
  if (filters.length === 1) return { AND: [base, filters[0]!] };
  return { AND: [base, { OR: filters }] };
}

export function leadMatchesScope(
  lead: {
    ownerId: string | null;
    convertedClientId: string | null;
  },
  scope: StaffLeadScope,
): boolean {
  const selfOk =
    !scope.selfOnly || !scope.userId || lead.ownerId === scope.userId;
  const clientOk =
    !scope.clientIds?.length ||
    (!!lead.convertedClientId &&
      scope.clientIds.includes(lead.convertedClientId));
  if (scope.selfOnly && scope.clientIds?.length) {
    return selfOk || clientOk;
  }
  return selfOk && clientOk;
}

export interface StaffTimeEntryScope {
  clientIds?: string[];
  projectIds?: string[];
  selfOnly?: boolean;
  membershipId?: string;
}

export function timeEntryListWhere(
  base: Prisma.TimeEntryWhereInput,
  scope: StaffTimeEntryScope,
): Prisma.TimeEntryWhereInput {
  const parts: Prisma.TimeEntryWhereInput[] = [base];
  if (scope.clientIds?.length) {
    parts.push({ clientId: { in: scope.clientIds } });
  }
  if (scope.projectIds?.length) {
    parts.push({ projectId: { in: scope.projectIds } });
  }
  if (scope.selfOnly && scope.membershipId) {
    parts.push({ membershipId: scope.membershipId });
  }
  return parts.length === 1 ? base : { AND: parts };
}

export function timeEntryMatchesScope(
  entry: {
    clientId: string | null;
    projectId: string | null;
    membershipId: string;
  },
  scope: StaffTimeEntryScope,
): boolean {
  if (scope.clientIds?.length) {
    if (!entry.clientId || !scope.clientIds.includes(entry.clientId)) {
      return false;
    }
  }
  if (scope.projectIds?.length) {
    if (!entry.projectId || !scope.projectIds.includes(entry.projectId)) {
      return false;
    }
  }
  if (scope.selfOnly && scope.membershipId) {
    if (entry.membershipId !== scope.membershipId) return false;
  }
  return true;
}

export function milestoneListWhere(
  base: Prisma.ProjectMilestoneWhereInput,
  scope: StaffProjectScope,
): Prisma.ProjectMilestoneWhereInput {
  const parts: Prisma.ProjectMilestoneWhereInput[] = [base];
  if (scope.clientIds?.length || scope.projectIds?.length || scope.selfOnly) {
    parts.push({
      project: projectListWhere({ deletedAt: null }, scope),
    });
  }
  return parts.length === 1 ? base : { AND: parts };
}
