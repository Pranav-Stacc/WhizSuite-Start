import { Injectable } from '@nestjs/common';
import {
  AssignableScopeTypes,
  DEFAULT_ROLE_TEMPLATES,
  PermissionEffects,
  RoleKinds,
  ScopeTypes,
  allowedScopesForPermission,
  isAssignableScopeType,
  isPermission,
  readPermissionScopeTypes,
  type AccessRoleSummary,
  type AssignableScopeType,
  type MemberPermissionOverride,
  type Permission,
  type PermissionEffect,
  type RoleAssignmentScopeInput,
  type RoleKind,
  type RoleInput,
  type ScopeType,
} from '@agency-os/contracts';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  applyPermissionOverrides,
  type PermissionInputs,
} from '../../application/utils/effective-permissions';
import { permissionPrefixForPath } from '../../application/utils/permission-prefix';
import {
  resolveDataScopeFromAssignments,
  scopesApplicableToPermissions,
  type ResolvedDataScope,
} from '../../application/utils/resolve-data-scope';
import {
  ACTIVE_MEMBERSHIP_STATUS,
  OWNER_MEMBERSHIP_TYPE,
} from '../../config/default-roles';

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

/** Unknown stored effects fail closed as DENY. */
export function asPermissionEffect(value: string): PermissionEffect {
  return value === PermissionEffects.ALLOW
    ? PermissionEffects.ALLOW
    : PermissionEffects.DENY;
}

/** Maps stored override rows to contract overrides, dropping keys no longer in the catalog. */
export function toOverrides(
  rows: ReadonlyArray<{ effect: string; permission: { key: string } }>,
): MemberPermissionOverride[] {
  return rows.flatMap(({ effect, permission }) =>
    isPermission(permission.key)
      ? [{ key: permission.key, effect: asPermissionEffect(effect) }]
      : [],
  );
}

function permissionConditions(
  key: string,
  input: Pick<RoleInput, 'permissionScopes' | 'defaultScopeTypes'>,
): Prisma.InputJsonValue {
  const row = input.permissionScopes?.find((scope) => scope.key === key);
  const scopeTypes = row?.scopeTypes ?? input.defaultScopeTypes;
  return { scopeTypes };
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

  /**
   * Everything the effective-permission formula needs for one membership. Inactive or
   * unknown memberships yield no permissions at all.
   */
  async loadPermissionInputs(
    organizationId: string,
    membershipId: string,
  ): Promise<PermissionInputs> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
        status: ACTIVE_MEMBERSHIP_STATUS,
      },
      select: {
        type: true,
        roleAssignments: {
          select: {
            role: {
              select: {
                permissions: {
                  where: { effect: PermissionEffects.ALLOW },
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
        permissionOverrides: {
          where: { organizationId },
          select: { effect: true, permission: { select: { key: true } } },
        },
      },
    });
    if (!membership) {
      return { rolePermissions: [], overrides: [], isOwner: false };
    }
    const rolePermissions = new Set<Permission>();
    for (const assignment of membership.roleAssignments) {
      for (const rp of assignment.role.permissions) {
        if (isPermission(rp.permission.key))
          rolePermissions.add(rp.permission.key);
      }
    }
    return {
      rolePermissions,
      overrides: toOverrides(membership.permissionOverrides),
      isOwner: membership.type === OWNER_MEMBERSHIP_TYPE,
    };
  }

  async getEffectivePermissions(
    organizationId: string,
    membershipId: string,
  ): Promise<Permission[]> {
    return applyPermissionOverrides(
      await this.loadPermissionInputs(organizationId, membershipId),
    );
  }

  /**
   * Role grants for one permission plus the member's direct override of it, if any.
   * Callers must apply the override before the role grants (DENY beats every role).
   */
  async getPermissionGrants(
    organizationId: string,
    membershipId: string,
    permissionKey: Permission,
  ) {
    const [assignments, membership] = await Promise.all([
      this.prisma.roleAssignment.findMany({
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
      }),
      this.prisma.organizationMembership.findFirst({
        where: {
          id: membershipId,
          organizationId,
          status: ACTIVE_MEMBERSHIP_STATUS,
        },
        select: {
          type: true,
          permissionOverrides: {
            where: { organizationId, permission: { key: permissionKey } },
            select: { effect: true },
          },
        },
      }),
    ]);

    const grants: Array<{
      effect: string;
      scopeType: string;
      resourceId: string | null;
    }> = [];
    if (!membership)
      return { grants, overrideEffect: undefined, isOwner: false };

    for (const assignment of assignments) {
      for (const rp of assignment.role.permissions) {
        const rule = {
          key: permissionKey,
          scopeTypes: readPermissionScopeTypes(rp.conditions),
        };
        const applicable =
          assignment.scopes.length === 0
            ? scopesApplicableToPermissions(
                [{ scopeType: 'ORGANIZATION', resourceId: null }],
                [rule],
              )
            : scopesApplicableToPermissions(assignment.scopes, [rule]);
        for (const scope of applicable) {
          grants.push({
            effect: rp.effect,
            scopeType: scope.scopeType,
            resourceId: scope.resourceId,
          });
        }
      }
    }
    const [override] = membership.permissionOverrides;
    return {
      grants,
      overrideEffect: override
        ? asPermissionEffect(override.effect)
        : undefined,
      isOwner: membership.type === OWNER_MEMBERSHIP_TYPE,
    };
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
        if (resource.type === 'content' || resource.type === 'task') {
          const row =
            resource.type === 'content'
              ? await this.prisma.contentItem.findFirst({
                  where: { id: resource.id, organizationId },
                  select: { clientId: true },
                })
              : await this.prisma.task.findFirst({
                  where: { id: resource.id, organizationId },
                  select: { project: { select: { clientId: true } } },
                });
          const clientId =
            resource.type === 'content'
              ? (row as { clientId: string } | null)?.clientId
              : (row as { project: { clientId: string } } | null)?.project
                  .clientId;
          return clientId === scopeResourceId;
        }
        if (
          resource.type === 'media' ||
          resource.type === 'folder' ||
          resource.type === 'asset'
        ) {
          const asset = await this.prisma.mediaAsset.findFirst({
            where: { id: resource.id, organizationId },
            select: { clientId: true },
          });
          if (asset) return asset.clientId === scopeResourceId;
          const folder = await this.prisma.mediaFolder.findFirst({
            where: { id: resource.id, organizationId },
            select: { clientId: true },
          });
          return folder?.clientId === scopeResourceId;
        }
        if (resource.type === 'invoice' || resource.type === 'contract') {
          const finance =
            resource.type === 'invoice'
              ? await this.prisma.invoice.findFirst({
                  where: { id: resource.id, organizationId },
                  select: { clientId: true },
                })
              : await this.prisma.contract.findFirst({
                  where: { id: resource.id, organizationId },
                  select: { clientId: true },
                });
          return finance?.clientId === scopeResourceId;
        }
        return false;
      case 'PROJECT':
        if (resource.type === 'project') return resource.id === scopeResourceId;
        if (resource.type === 'task') {
          const task = await this.prisma.task.findFirst({
            where: { id: resource.id, organizationId },
            select: { projectId: true },
          });
          return task?.projectId === scopeResourceId;
        }
        if (resource.type === 'content') {
          const content = await this.prisma.contentItem.findFirst({
            where: { id: resource.id, organizationId },
            select: { projectId: true },
          });
          return content?.projectId === scopeResourceId;
        }
        if (
          resource.type === 'media' ||
          resource.type === 'asset' ||
          resource.type === 'folder'
        ) {
          const asset = await this.prisma.mediaAsset.findFirst({
            where: { id: resource.id, organizationId },
            select: { projectId: true },
          });
          if (asset?.projectId) return asset.projectId === scopeResourceId;
          const folder = await this.prisma.mediaFolder.findFirst({
            where: { id: resource.id, organizationId },
            select: { projectId: true },
          });
          return folder?.projectId === scopeResourceId;
        }
        return false;
      case 'CONTENT':
        return resource.type === 'content' && resource.id === scopeResourceId;
      case 'TASK':
        return resource.type === 'task' && resource.id === scopeResourceId;
      default:
        return resource.id === scopeResourceId;
    }
  }

  /**
   * Compiles role-assignment scopes into list filters for staff.
   * Org-wide grants clear restrictions; otherwise union CLIENT/PROJECT/CONTENT resource ids.
   */
  async resolveDataScope(
    organizationId: string,
    membershipId: string,
    url?: string,
  ): Promise<ResolvedDataScope> {
    const prefix = url ? permissionPrefixForPath(url) : undefined;
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { organizationId, membershipId },
      include: {
        scopes: true,
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
    const compiled = assignments
      .map((assignment) => ({
        scopes: scopesApplicableToPermissions(
          assignment.scopes,
          assignment.role.permissions.map((row) => ({
            key: row.permission.key,
            scopeTypes: readPermissionScopeTypes(row.conditions),
          })),
          prefix ? [prefix] : undefined,
        ),
      }))
      .filter((assignment) => assignment.scopes.length > 0);

    if (assignments.length > 0 && compiled.length === 0) {
      return {
        orgWide: false,
        selfOnly: false,
        clientIds: [],
        projectIds: [],
        contentIds: [],
      };
    }

    return resolveDataScopeFromAssignments(
      this.prisma,
      organizationId,
      membershipId,
      compiled,
    );
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
            conditions: permissionConditions(p.key, input),
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
            conditions: permissionConditions(p.key, {
              permissionScopes: input.permissionScopes,
              defaultScopeTypes: input.defaultScopeTypes ?? [
                AssignableScopeTypes.ORGANIZATION,
              ],
            }),
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

  /** Creates editable default roles (Admin, Member, Client portal) for a new organisation. */
  async ensureDefaultRoleTemplates(organizationId: string) {
    for (const template of DEFAULT_ROLE_TEMPLATES) {
      const existing = await this.prisma.role.findFirst({
        where: { organizationId, name: template.name, isSystem: false },
        select: { id: true },
      });
      if (existing) continue;
      const defaultScopeTypes: AssignableScopeType[] = (
        template.defaultScopeTypes ?? [AssignableScopeTypes.ORGANIZATION]
      ).filter((scope): scope is AssignableScopeType => isAssignableScopeType(scope));
      await this.createRole(organizationId, {
        name: template.name,
        description: undefined,
        kind: template.kind ?? RoleKinds.ACCESS,
        permissionKeys: [...template.permissions],
        defaultScopeTypes,
        permissionScopes: template.permissions.map((key) => {
          const allowed = allowedScopesForPermission(key);
          const assignableAllowed = allowed.filter((scope): scope is AssignableScopeType =>
            isAssignableScopeType(scope),
          );
          const scopeTypes = defaultScopeTypes.filter((scope) =>
            assignableAllowed.includes(scope),
          );
          return {
            key,
            scopeTypes:
              scopeTypes.length > 0
                ? scopeTypes
                : assignableAllowed.includes(AssignableScopeTypes.ORGANIZATION)
                  ? [AssignableScopeTypes.ORGANIZATION]
                  : assignableAllowed,
          };
        }),
      });
    }
  }

  async findRoleByName(organizationId: string, name: string) {
    return this.prisma.role.findFirst({
      where: { organizationId, name, isSystem: false },
      select: { id: true },
    });
  }

  async findOrCreateSystemRole(
    organizationId: string,
    name: string,
    permissionKeys: readonly string[],
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { organizationId, name, isSystem: true },
      select: {
        id: true,
        permissions: { select: { permission: { select: { key: true } } } },
      },
    });
    if (existing) {
      await this.ensureSystemRolePermissions(
        existing.id,
        permissionKeys,
        existing.permissions,
      );
      return { id: existing.id };
    }
    return this.createSystemRole(organizationId, name, [...permissionKeys]);
  }

  /** Keeps system roles in sync when contracts add permissions (e.g. Client portal). */
  private async ensureSystemRolePermissions(
    roleId: string,
    permissionKeys: readonly string[],
    current: { permission: { key: string } }[],
  ) {
    const held = new Set(current.map((row) => row.permission.key));
    const missing = permissionKeys.filter((key) => !held.has(key));
    if (missing.length === 0) return;
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: [...missing] } },
    });
    if (permissions.length === 0) return;
    await this.prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId,
        permissionId: p.id,
        effect: 'ALLOW',
      })),
      skipDuplicates: true,
    });
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

  /** Designation placements for every membership in the org, keyed by membership id. */
  async designationsByMembership(
    organizationId: string,
  ): Promise<
    Map<string, Array<{ designationId: string; isPrimary: boolean }>>
  > {
    const rows = await this.prisma.memberDesignation.findMany({
      where: { organizationId },
      select: { membershipId: true, designationId: true, isPrimary: true },
      orderBy: { createdAt: 'asc' },
    });
    const byMembership = new Map<
      string,
      Array<{ designationId: string; isPrimary: boolean }>
    >();
    for (const row of rows) {
      const list = byMembership.get(row.membershipId) ?? [];
      list.push({
        designationId: row.designationId,
        isPrimary: row.isPrimary,
      });
      byMembership.set(row.membershipId, list);
    }
    return byMembership;
  }

  /** Member counts per designation id (only includes designations that have rows). */
  async designationMemberCounts(
    organizationId: string,
    designationIds?: readonly string[],
  ): Promise<Map<string, number>> {
    const grouped = await this.prisma.memberDesignation.groupBy({
      by: ['designationId'],
      where: {
        organizationId,
        ...(designationIds
          ? { designationId: { in: [...designationIds] } }
          : {}),
      },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.designationId, row._count._all]));
  }

  replaceMembershipDesignations(
    organizationId: string,
    membershipId: string,
    items: ReadonlyArray<{ designationId: string; isPrimary: boolean }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.memberDesignation.deleteMany({
        where: { organizationId, membershipId },
      });
      if (items.length === 0) return;
      await tx.memberDesignation.createMany({
        data: items.map((item) => ({
          organizationId,
          membershipId,
          designationId: item.designationId,
          isPrimary: item.isPrimary,
        })),
      });
    });
  }

  /** Number of direct permission overrides per membership. */
  async overrideCountsByMembership(
    organizationId: string,
  ): Promise<Map<string, number>> {
    const grouped = await this.prisma.memberPermissionOverride.groupBy({
      by: ['membershipId'],
      where: { organizationId },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.membershipId, row._count._all]));
  }

  listMemberOverrides(organizationId: string, membershipId: string) {
    return this.prisma.memberPermissionOverride.findMany({
      where: { organizationId, membershipId },
      select: { effect: true, permission: { select: { key: true } } },
    });
  }

  findPermissionsByKeys(keys: readonly string[]) {
    return this.prisma.permission.findMany({
      where: { key: { in: [...keys] } },
      select: { id: true, key: true },
    });
  }

  replaceMemberOverrides(
    organizationId: string,
    membershipId: string,
    actorId: string,
    items: ReadonlyArray<{ permissionId: string; effect: PermissionEffect }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.memberPermissionOverride.deleteMany({
        where: { organizationId, membershipId },
      });
      if (items.length === 0) return;
      await tx.memberPermissionOverride.createMany({
        data: items.map((item) => ({
          organizationId,
          membershipId,
          permissionId: item.permissionId,
          effect: item.effect,
          createdBy: actorId,
        })),
      });
    });
  }

  updateEmploymentType(
    organizationId: string,
    membershipId: string,
    employmentType: string | null,
  ) {
    return this.prisma.organizationMembership.update({
      where: { id: membershipId, organizationId },
      data: { employmentType },
      select: { id: true, employmentType: true },
    });
  }

  listMemberDocuments(organizationId: string, membershipId: string) {
    return this.prisma.memberDocument.findMany({
      where: { organizationId, membershipId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createMemberDocument(input: {
    organizationId: string;
    membershipId: string;
    type: string;
    title: string;
    templateId?: string | null;
    status?: string;
    metadata?: Prisma.InputJsonValue;
    createdBy?: string | null;
  }) {
    return this.prisma.memberDocument.create({ data: input });
  }
}
