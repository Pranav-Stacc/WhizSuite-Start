import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Permissions,
  themeSchema,
  type ThemeSettings,
} from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { TenantContext } from '../../../../../shared/tenant/tenant.context';
import { TenancyService } from '../../../application/services/tenancy.service';
import { CreateWorkspaceDto } from '../dto/workspace.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('v1/organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get('current')
  @RequirePermissions(Permissions.ORG_VIEW)
  getCurrent(@Headers('x-organization-id') orgHeader?: string) {
    const orgId = orgHeader ?? TenantContext.getOrganizationId() ?? undefined;
    if (!orgId) return this.tenancy.requireOrgFromContext();
    return this.tenancy.getOrganization(orgId);
  }

  @Get(':organizationId/theme')
  @RequirePermissions(Permissions.ORG_VIEW)
  getTheme(@Param('organizationId') organizationId: string) {
    return this.tenancy
      .getAppearanceTheme(requireOrganizationId(organizationId))
      .then((theme) => ({ theme }));
  }

  @Patch(':organizationId/theme')
  @RequirePermissions(Permissions.ORG_BRANDING_MANAGE)
  updateTheme(
    @Param('organizationId') organizationId: string,
    @Body() body: ThemeSettings,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const theme = themeSchema.parse(body);
    return this.tenancy
      .updateAppearanceTheme(
        requireOrganizationId(organizationId),
        user.userId,
        theme,
      )
      .then((saved) => ({ theme: saved }));
  }

  @Get(':organizationId')
  @RequirePermissions(Permissions.ORG_VIEW)
  getOne(@Param('organizationId') organizationId: string) {
    return this.tenancy.getOrganization(organizationId);
  }

  @Get(':organizationId/workspaces')
  @RequirePermissions(Permissions.WORKSPACES_VIEW)
  listWorkspaces(@Param('organizationId') organizationId: string) {
    return this.tenancy.listWorkspaces(organizationId);
  }

  @Post(':organizationId/workspaces')
  @RequirePermissions(Permissions.WORKSPACES_CREATE)
  createWorkspace(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.createWorkspace(organizationId, user.userId, dto);
  }
}
