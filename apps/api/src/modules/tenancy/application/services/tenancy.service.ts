import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DEFAULT_THEME,
  DomainEventTypes,
  ErrorCodes,
  ORG_APPEARANCE_THEME_KEY,
  coerceProductDefaultTheme,
  themeSchema,
  type ThemeSettings,
  type UpdateOrgThemeInput,
} from '@agency-os/contracts';
import { Prisma } from '@prisma/client';
import {
  ProblemDetailsException,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AccessRepository } from '../../../access/infrastructure/repositories/access.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { TenancyRepository } from '../../infrastructure/repositories/tenancy.repository';
import {
  recomputeSubtreePaths,
  wouldCreateCycle,
} from '../utils/department-paths';

@Injectable()
export class TenancyService {
  constructor(
    private readonly repo: TenancyRepository,
    private readonly access: AccessRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  async getOrganization(organizationId: string) {
    const org = await this.repo.findOrganization(organizationId);
    if (!org) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.NOT_FOUND,
        },
        404,
      );
    }
    return org;
  }

  /** Agency-wide appearance — every staff and client member sees these colours after login. */
  async getAppearanceTheme(organizationId: string): Promise<ThemeSettings> {
    const row = await this.repo.getSetting(
      organizationId,
      ORG_APPEARANCE_THEME_KEY,
    );
    if (!row?.value)
      return themeFromBranding(
        await this.repo.findOrganization(organizationId),
      );
    const parsed = themeSchema.safeParse(row.value);
    const theme = parsed.success
      ? parsed.data
      : themeFromBranding(await this.repo.findOrganization(organizationId));
    const resolved = coerceProductDefaultTheme(theme);
    if (resolved !== theme) {
      await this.repo.upsertSetting(
        organizationId,
        ORG_APPEARANCE_THEME_KEY,
        resolved,
      );
    }
    return resolved;
  }

  async updateAppearanceTheme(
    organizationId: string,
    actorId: string,
    input: UpdateOrgThemeInput,
  ): Promise<ThemeSettings> {
    const theme = themeSchema.parse(input);
    await this.repo.upsertSetting(
      organizationId,
      ORG_APPEARANCE_THEME_KEY,
      theme,
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'org.theme.update',
      entityType: 'organization',
      entityId: organizationId,
      after: theme,
    });
    return theme;
  }

  async listWorkspaces(organizationId: string) {
    return this.repo.listWorkspaces(organizationId);
  }

  /** The organisation's default workspace, falling back to the first one. */
  async defaultWorkspaceId(
    organizationId: string,
  ): Promise<string | undefined> {
    const workspaces = await this.repo.listWorkspaces(organizationId);
    return (workspaces.find((w) => w.isDefault) ?? workspaces[0])?.id;
  }

  async createWorkspace(
    organizationId: string,
    actorId: string,
    input: { name: string; slug: string; timezone?: string },
  ) {
    const workspace = await this.repo.createWorkspace({
      organizationId,
      name: input.name,
      slug: input.slug.toLowerCase(),
      timezone: input.timezone,
    });

    await this.outbox.write({
      type: DomainEventTypes.WORKSPACE_CREATED,
      version: 1,
      organizationId,
      payload: { workspaceId: workspace.id, name: workspace.name },
      actor: { id: actorId, type: 'user' },
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'workspace.create',
      entityType: 'workspace',
      entityId: workspace.id,
      after: workspace,
    });

    return workspace;
  }

  async createDepartment(
    organizationId: string,
    actorId: string,
    input: { name: string; parentId?: string },
  ) {
    try {
      const department = await this.repo.createDepartment(
        organizationId,
        input,
      );
      await this.audit.record({
        organizationId,
        actorId,
        actorType: 'user',
        action: 'department.create',
        entityType: 'department',
        entityId: department.id,
        after: department,
      });
      return department;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Parent department not found'
      ) {
        throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
      }
      throw error;
    }
  }

  async listDepartments(organizationId: string) {
    const [departments, counts] = await Promise.all([
      this.repo.listDepartments(organizationId),
      this.access.designationMemberCounts(organizationId),
    ]);
    return departments.map((department) => ({
      ...department,
      designations: department.designations.map((designation) => ({
        id: designation.id,
        name: designation.name,
        isHead: designation.isHead,
        memberCount: counts.get(designation.id) ?? 0,
      })),
    }));
  }

  async updateDepartment(
    organizationId: string,
    actorId: string,
    departmentId: string,
    input: { name?: string; parentId?: string | null },
  ) {
    const current = await this.repo.findDepartment(
      organizationId,
      departmentId,
    );
    if (!current) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    const nextName = input.name?.trim() || current.name;
    const nextParentId =
      input.parentId === undefined ? current.parentId : input.parentId;

    if (nextParentId) {
      const parent = await this.repo.findDepartment(
        organizationId,
        nextParentId,
      );
      if (!parent) {
        throw problem(
          HttpStatus.NOT_FOUND,
          'Not Found',
          ErrorCodes.NOT_FOUND,
          'Parent department not found',
        );
      }
      const nodes = await this.repo.listDepartmentNodes(organizationId);
      if (wouldCreateCycle(nodes, departmentId, nextParentId)) {
        throw problem(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid parent',
          ErrorCodes.VALIDATION_FAILED,
          'A department cannot be moved under itself or one of its descendants',
        );
      }
    }

    const nodes = await this.repo.listDepartmentNodes(organizationId);
    const updates = recomputeSubtreePaths(nodes, departmentId, {
      name: nextName,
      parentId: nextParentId,
    });
    await this.repo.applyDepartmentUpdates(updates);
    const updated = await this.repo.findDepartment(
      organizationId,
      departmentId,
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'department.update',
      entityType: 'department',
      entityId: departmentId,
      before: {
        name: current.name,
        parentId: current.parentId,
        path: current.path,
      },
      after: updated
        ? { name: updated.name, parentId: updated.parentId, path: updated.path }
        : undefined,
    });
    return updated;
  }

  async deleteDepartment(
    organizationId: string,
    actorId: string,
    departmentId: string,
  ) {
    const current = await this.repo.findDepartment(
      organizationId,
      departmentId,
    );
    if (!current) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    if (current.children.length > 0) {
      throw problem(
        HttpStatus.CONFLICT,
        'Conflict',
        ErrorCodes.CONFLICT,
        'Remove or move child departments first',
      );
    }
    const designationIds = current.designations.map((d) => d.id);
    if (designationIds.length > 0) {
      const counts = await this.access.designationMemberCounts(
        organizationId,
        designationIds,
      );
      const assigned = designationIds.some((id) => (counts.get(id) ?? 0) > 0);
      if (assigned) {
        throw problem(
          HttpStatus.CONFLICT,
          'Conflict',
          ErrorCodes.CONFLICT,
          "Remove members from this department's positions first",
        );
      }
    }
    await this.repo.deleteDepartment(organizationId, departmentId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'department.delete',
      entityType: 'department',
      entityId: departmentId,
      before: { name: current.name, path: current.path },
    });
  }

  async createDesignation(
    organizationId: string,
    actorId: string,
    departmentId: string,
    input: { name: string; isHead?: boolean },
  ) {
    const department = await this.repo.findDepartment(
      organizationId,
      departmentId,
    );
    if (!department) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    try {
      const designation = await this.repo.createDesignation(
        organizationId,
        departmentId,
        { name: input.name.trim(), isHead: input.isHead },
      );
      await this.audit.record({
        organizationId,
        actorId,
        actorType: 'user',
        action: 'designation.create',
        entityType: 'designation',
        entityId: designation.id,
        after: designation,
      });
      return {
        id: designation.id,
        departmentId: designation.departmentId,
        name: designation.name,
        isHead: designation.isHead,
        memberCount: 0,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw problem(
          HttpStatus.CONFLICT,
          'Conflict',
          ErrorCodes.CONFLICT,
          'A position with this name already exists in the department',
        );
      }
      throw error;
    }
  }

  async updateDesignation(
    organizationId: string,
    actorId: string,
    designationId: string,
    input: { name?: string; isHead?: boolean },
  ) {
    const current = await this.repo.findDesignation(
      organizationId,
      designationId,
    );
    if (!current) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    try {
      await this.repo.updateDesignation(organizationId, designationId, {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.isHead !== undefined ? { isHead: input.isHead } : {}),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw problem(
          HttpStatus.CONFLICT,
          'Conflict',
          ErrorCodes.CONFLICT,
          'A position with this name already exists in the department',
        );
      }
      throw error;
    }
    const updated = await this.repo.findDesignation(
      organizationId,
      designationId,
    );
    const counts = await this.access.designationMemberCounts(organizationId, [
      designationId,
    ]);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'designation.update',
      entityType: 'designation',
      entityId: designationId,
      before: { name: current.name, isHead: current.isHead },
      after: updated
        ? { name: updated.name, isHead: updated.isHead }
        : undefined,
    });
    return {
      id: designationId,
      departmentId: current.departmentId,
      name: updated?.name ?? current.name,
      isHead: updated?.isHead ?? current.isHead,
      memberCount: counts.get(designationId) ?? 0,
    };
  }

  async deleteDesignation(
    organizationId: string,
    actorId: string,
    designationId: string,
  ) {
    const current = await this.repo.findDesignation(
      organizationId,
      designationId,
    );
    if (!current) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    const counts = await this.access.designationMemberCounts(organizationId, [
      designationId,
    ]);
    if ((counts.get(designationId) ?? 0) > 0) {
      throw problem(
        HttpStatus.CONFLICT,
        'Conflict',
        ErrorCodes.CONFLICT,
        'Remove members from this position first',
      );
    }
    await this.repo.deleteDesignation(organizationId, designationId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'designation.delete',
      entityType: 'designation',
      entityId: designationId,
      before: { name: current.name, departmentId: current.departmentId },
    });
  }

  /** Lookup used by the identity module when enriching members with positions. */
  designationsByIds(organizationId: string, designationIds: readonly string[]) {
    return this.repo.designationsByIds(organizationId, designationIds);
  }

  async listTeams(organizationId: string) {
    return this.repo.listTeams(organizationId);
  }

  async createTeam(
    organizationId: string,
    actorId: string,
    input: { name: string; description?: string; workspaceId?: string },
  ) {
    const team = await this.repo.createTeam(organizationId, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'team.create',
      entityType: 'team',
      entityId: team.id,
      after: team,
    });
    return team;
  }

  requireOrgFromContext(): string {
    const orgId = TenantContext.getOrganizationId();
    if (!orgId) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Tenant Required',
          status: 400,
          code: ErrorCodes.TENANT_REQUIRED,
        },
        400,
      );
    }
    return orgId;
  }
}

function themeFromBranding(
  org: {
    branding: {
      primaryColor: string | null;
      secondaryColor: string | null;
      accentColor: string | null;
    } | null;
  } | null,
): ThemeSettings {
  const branding = org?.branding;
  if (!branding?.primaryColor) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    primary: branding.primaryColor,
    secondary: branding.secondaryColor ?? DEFAULT_THEME.secondary,
    border: branding.accentColor ?? DEFAULT_THEME.border,
  };
}
