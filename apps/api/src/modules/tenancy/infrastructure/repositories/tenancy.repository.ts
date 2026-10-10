import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class TenancyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOrganization(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { branding: true },
    });
  }

  getSetting(organizationId: string, key: string) {
    return this.prisma.organizationSetting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
  }

  upsertSetting(organizationId: string, key: string, value: unknown) {
    return this.prisma.organizationSetting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value: value as object },
      update: { value: value as object },
    });
  }

  findOrganizationBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  listWorkspaces(organizationId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  createWorkspace(data: {
    organizationId: string;
    name: string;
    slug: string;
    timezone?: string;
  }) {
    return this.prisma.workspace.create({ data });
  }

  listDepartments(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { path: 'asc' },
      include: { designations: true },
    });
  }

  async createDepartment(
    organizationId: string,
    input: { name: string; parentId?: string },
  ) {
    let path = input.name;
    let depth = 0;
    if (input.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: input.parentId, organizationId },
      });
      if (!parent) throw new Error('Parent department not found');
      path = `${parent.path}/${input.name}`;
      depth = parent.depth + 1;
    }
    return this.prisma.department.create({
      data: {
        organizationId,
        parentId: input.parentId,
        name: input.name,
        path,
        depth,
      },
    });
  }

  listTeams(organizationId: string) {
    return this.prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  }

  createTeam(
    organizationId: string,
    input: { name: string; description?: string; workspaceId?: string },
  ) {
    return this.prisma.team.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
      },
    });
  }

  findDepartment(organizationId: string, departmentId: string) {
    return this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
      include: { designations: true, children: { select: { id: true } } },
    });
  }

  listDepartmentNodes(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
        depth: true,
      },
    });
  }

  applyDepartmentUpdates(
    updates: ReadonlyArray<{
      id: string;
      name: string;
      parentId: string | null;
      path: string;
      depth: number;
    }>,
  ) {
    return this.prisma.$transaction(
      updates.map((row) =>
        this.prisma.department.update({
          where: { id: row.id },
          data: {
            name: row.name,
            parentId: row.parentId,
            path: row.path,
            depth: row.depth,
          },
        }),
      ),
    );
  }

  deleteDepartment(organizationId: string, departmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.designation.deleteMany({
        where: { organizationId, departmentId },
      });
      await tx.department.deleteMany({
        where: { id: departmentId, organizationId },
      });
    });
  }

  /** Designation rows with their department names, keyed by designation id. */
  async designationsByIds(
    organizationId: string,
    designationIds: readonly string[],
  ) {
    type Ref = {
      id: string;
      name: string;
      isHead: boolean;
      departmentId: string;
      departmentName: string;
    };
    const byId = new Map<string, Ref>();
    if (designationIds.length === 0) return byId;
    const rows = await this.prisma.designation.findMany({
      where: { organizationId, id: { in: [...designationIds] } },
      select: {
        id: true,
        name: true,
        isHead: true,
        departmentId: true,
        department: { select: { name: true } },
      },
    });
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        name: row.name,
        isHead: row.isHead,
        departmentId: row.departmentId,
        departmentName: row.department.name,
      });
    }
    return byId;
  }

  findDesignation(organizationId: string, designationId: string) {
    return this.prisma.designation.findFirst({
      where: { id: designationId, organizationId },
    });
  }

  createDesignation(
    organizationId: string,
    departmentId: string,
    input: { name: string; isHead?: boolean },
  ) {
    return this.prisma.designation.create({
      data: {
        organizationId,
        departmentId,
        name: input.name,
        isHead: input.isHead ?? false,
      },
    });
  }

  updateDesignation(
    organizationId: string,
    designationId: string,
    input: { name?: string; isHead?: boolean },
  ) {
    return this.prisma.designation.updateMany({
      where: { id: designationId, organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isHead !== undefined ? { isHead: input.isHead } : {}),
      },
    });
  }

  deleteDesignation(organizationId: string, designationId: string) {
    return this.prisma.designation.deleteMany({
      where: { id: designationId, organizationId },
    });
  }
}
