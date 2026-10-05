import { Injectable } from '@nestjs/common';
import type { Permission, ScopeType } from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';

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

  listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        assignments: { select: { id: true } },
      },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  async createRole(
    organizationId: string,
    input: { name: string; description?: string; permissionKeys: string[] },
  ) {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: input.permissionKeys } },
    });
    return this.prisma.role.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id, effect: 'ALLOW' })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async updateRole(
    organizationId: string,
    roleId: string,
    input: { name?: string; description?: string; permissionKeys?: string[] },
  ) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, organizationId } });
    if (!role) return null;
    if (input.permissionKeys) {
      const permissions = await this.prisma.permission.findMany({
        where: { key: { in: input.permissionKeys } },
      });
      await this.prisma.rolePermission.deleteMany({ where: { roleId } });
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id, effect: 'ALLOW' })),
      });
    }
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
      include: { permissions: { include: { permission: true } }, assignments: { select: { id: true } } },
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
