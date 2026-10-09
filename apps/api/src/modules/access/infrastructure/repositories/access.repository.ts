import { Injectable } from '@nestjs/common';
import {
  AssignableScopeTypes,
  RoleKinds,
  ScopeTypes,
  type AccessRoleSummary,
  type AssignableScopeType,
  type Permission,
  type RoleAssignmentScopeInput,
  type RoleKind,
  type RoleInput,
  type ScopeType,
} from '@agency-os/contracts';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

const ROLE_SUMMARY_SELECT = {
  id: true,
  name: true,
  isSystem: true,
  kind: true,
  defaultScopeTypes: true,
} as const;

function asScopeTypes(value: unknown): ScopeType[] {
  if (!Array.isArray(value)) return [ScopeTypes.ORGANIZATION];
  const scopes = value.filter(
    (entry): entry is ScopeType => typeof entry === 'string',
  );
  return scopes.length > 0 ? scopes : [ScopeTypes.ORGANIZATION];
}

function asRoleKind(value: string): RoleKind {
  return value === RoleKinds.WORKFLOW ? RoleKinds.WORKFLOW : RoleKinds.ACCESS;
}

function toRoleSummary(role: {
  id: string;
  name: string;
  isSystem: boolean;
  kind: string;
  defaultScopeTypes: unknown;
}): AccessRoleSummary {
  return {
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
    kind: asRoleKind(role.kind),
    defaultScopeTypes: asScopeTypes(role.defaultScopeTypes),
  };
}

function defaultAssignmentScopes(
  organizationId: string,
  scopes?: readonly RoleAssignmentScopeInput[],
): Array<{
  organizationId: string;
  scopeType: AssignableScopeType;
  resourceId: string | null;
}> {
  const list =
    scopes && scopes.length > 0
      ? scopes
      : [{ scopeType: AssignableScopeTypes.ORGANIZATION }];
  return list.map((scope) => ({
    organizationId,
    scopeType: scope.scopeType,
    resourceId: scope.resourceId ?? null,
  }));
}

@Injectable()
export class AccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(
    organizationId: string,
    membershipId: string,
  ): Promise<Permission[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, membershipId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
              where: { effect: 'ALLOW' },
            },
          },
        },
      },
    });

    const set = new Set<Permission>();
    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) {
        set.add(rp.permission.key as Permission);
      }
    }
    return [...set];
  }

  async getPermissionGrants(
    organizationId: string,
    membershipId: string,
    permissionKey: Permission,
  ) {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, membershipId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
              where: { permission: { key: permissionKey } },
            },
          },
        },
        scopes: true,
      },
    });

    const grants: Array<{
      effect: string;
      scopeType: string;
      resourceId: string | null;
    }> = [];

    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) {
        if (assignment.scopes.length === 0) {
          grants.push({
            effect: rp.effect,
            scopeType: 'ORGANIZATION',
            resourceId: null,
          });
        } else {
          for (const scope of assignment.scopes) {
            grants.push({
              effect: rp.effect,
              scopeType: scope.scopeType,
              resourceId: scope.resourceId,
            });
          }
        }
      }
    }
    return grants;
  }

  async isResourceInScope(
    organizationId: string,
    scopeType: ScopeType,
    scopeResourceId: string | null,
    resource: { type: string; id: string },
  ): Promise<boolean> {
    if (scopeType === 'ORGANIZATION') return true;
    if (scopeType === 'SELF') return false; // resolved at call site with actor
    if (!scopeResourceId) return false;

    switch (scopeType) {
      case 'CLIENT':
        if (resource.type === 'client') return resource.id === scopeResourceId;
        if (resource.type === 'project') {
          const project = await this.prisma.project.findFirst({
            where: { id: resource.id, organizationId },
            select: { clientId: true },
          });
          return project?.clientId === scopeResourceId;
        }
        return false;
      case 'PROJECT':
        return resource.type === 'project' && resource.id === scopeResourceId;
      default:
        return resource.id === scopeResourceId;
    }
  }

  async seedPermissions(catalog: Array<{ key: string; category: string }>) {
    for (const item of catalog) {
      await this.prisma.permission.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          category: item.category,
          description: item.key,
        },
        update: { category: item.category },
      });
    }
  }

  listRoles(organizationId: string, kind?: RoleKind) {
    return this.prisma.role.findMany({
      where: {
        organizationId,
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      include: {
        permissions: { include: { permission: true } },
        assignments: { select: { id: true } },
      },
    });
  }

  findRole(organizationId: string, roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      select: {
        id: true,
        name: true,
        isSystem: true,
        kind: true,
        defaultScopeTypes: true,
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { assignments: true } },
      },
    });
  }

  findRoles(organizationId: string, roleIds: readonly string[]) {
    return this.prisma.role
      .findMany({
        where: { organizationId, id: { in: [...roleIds] } },
        select: ROLE_SUMMARY_SELECT,
      })
      .then((rows) => rows.map(toRoleSummary));
  }

  deleteRole(organizationId: string, roleId: string) {
    return this.prisma.role.deleteMany({
      where: { id: roleId, organizationId },
    });
  }

  /** Roles held by each membership, keyed by membership id. */
  async rolesByMembership(
    organizationId: string,
    membershipIds?: readonly string[],
  ): Promise<Map<string, AccessRoleSummary[]>> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        organizationId,
        ...(membershipIds ? { membershipId: { in: [...membershipIds] } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { membershipId: true, role: { select: ROLE_SUMMARY_SELECT } },
    });
    const byMembership = new Map<string, AccessRoleSummary[]>();
    for (const { membershipId, role } of assignments) {
      const list = byMembership.get(membershipId) ?? [];
      list.push(toRoleSummary(role));
      byMembership.set(membershipId, list);
    }
    return byMembership;
  }

  /**
   * Membership ids that hold `roleId`, optionally narrowed by assignment scope
   * (e.g. CLIENT + resourceId for a workflow stage on a client-owned entity).
   */
  async membershipIdsForRole(
    organizationId: string,
    roleId: string,
    scope?: { scopeType: ScopeType; resourceId?: string | null },
  ): Promise<string[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, roleId },
      select: {
        membershipId: true,
        scopes: { select: { scopeType: true, resourceId: true } },
      },
    });
    if (!scope) {
      return [...new Set(assignments.map((row) => row.membershipId))];
    }
    return [
      ...new Set(
        assignments
          .filter((row) => {
            if (row.scopes.length === 0) {
              return scope.scopeType === ScopeTypes.ORGANIZATION;
            }
            return row.scopes.some((entry) => {
              if (entry.scopeType === ScopeTypes.ORGANIZATION) return true;
              if (entry.scopeType !== scope.scopeType) return false;
              if (!scope.resourceId) return true;
              return entry.resourceId === scope.resourceId;
            });
          })
          .map((row) => row.membershipId),
      ),
    ];
  }

  /** Replaces every role a membership holds; scopes default to organisation-wide. */
  replaceAssignments(
    organizationId: string,
    membershipId: string,
    roleIds: readonly string[],
    scopes?: readonly RoleAssignmentScopeInput[],
  ) {
    const scopeRows = defaultAssignmentScopes(organizationId, scopes);
    return this.prisma.$transaction(async (tx) => {
      await tx.roleAssignment.deleteMany({
        where: { organizationId, membershipId },
      });
      for (const roleId of roleIds) {
        await tx.roleAssignment.create({
          data: {
            organizationId,
            membershipId,
            roleId,
            scopes: { create: scopeRows },
          },
        });
      }
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async createRole(organizationId: string, input: RoleInput) {
    const permissions =
      input.permissionKeys.length > 0
        ? await this.prisma.permission.findMany({
            where: { key: { in: input.permissionKeys } },
          })
        : [];
    return this.prisma.role.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        kind: input.kind,
        defaultScopeTypes: input.defaultScopeTypes,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
            effect: 'ALLOW',
          })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    input: Partial<RoleInput>,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });
    if (!role) return null;
    if (input.permissionKeys) {
      const permissions =
        input.permissionKeys.length > 0
          ? await this.prisma.permission.findMany({
              where: { key: { in: input.permissionKeys } },
            })
          : [];
      await this.prisma.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId,
            permissionId: p.id,
            effect: 'ALLOW',
          })),
        });
      }
    }
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.kind ? { kind: input.kind } : {}),
        ...(input.defaultScopeTypes
          ? {
              defaultScopeTypes: input.defaultScopeTypes,
            }
          : {}),
      },
      include: {
        permissions: { include: { permission: true } },
        assignments: { select: { id: true } },
      },
    });
  }

  async findOrCreateSystemRole(
    organizationId: string,
    name: string,
    permissionKeys: readonly string[],
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, name, isSystem: true },
      select: { id: true },
    });
    if (existing) return existing;
    return this.createSystemRole(organizationId, name, [...permissionKeys]);
  }

  async createSystemRole(
    organizationId: string,
    name: string,
    permissionKeys: string[],
  ) {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name,
        isSystem: true,
        kind: RoleKinds.ACCESS,
        defaultScopeTypes: [
          AssignableScopeTypes.ORGANIZATION,
        ] as Prisma.InputJsonValue,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
            effect: 'ALLOW',
          })),
        },
      },
    });
    return role;
  }
}
