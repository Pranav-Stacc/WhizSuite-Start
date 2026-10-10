import { Injectable } from '@nestjs/common';
import {
  DEFAULT_THEME,
  DomainEventTypes,
  ErrorCodes,
  ORG_APPEARANCE_THEME_KEY,
  themeSchema,
  type ThemeSettings,
  type UpdateOrgThemeInput,
} from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { TenancyRepository } from '../../infrastructure/repositories/tenancy.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

@Injectable()
export class TenancyService {
  constructor(
    private readonly repo: TenancyRepository,
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
    const row = await this.repo.getSetting(organizationId, ORG_APPEARANCE_THEME_KEY);
    if (!row?.value) return themeFromBranding(await this.repo.findOrganization(organizationId));
    const parsed = themeSchema.safeParse(row.value);
    return parsed.success ? parsed.data : themeFromBranding(await this.repo.findOrganization(organizationId));
  }

  async updateAppearanceTheme(
    organizationId: string,
    actorId: string,
    input: UpdateOrgThemeInput,
  ): Promise<ThemeSettings> {
    const theme = themeSchema.parse(input);
    await this.repo.upsertSetting(organizationId, ORG_APPEARANCE_THEME_KEY, theme);
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
    const department = await this.repo.createDepartment(organizationId, input);
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
  }

  async listDepartments(organizationId: string) {
    return this.repo.listDepartments(organizationId);
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
  org: { branding: { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null } | null } | null,
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
