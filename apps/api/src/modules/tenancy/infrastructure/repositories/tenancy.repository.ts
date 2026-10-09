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
}
