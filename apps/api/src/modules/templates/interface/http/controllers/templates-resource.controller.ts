import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { TemplatesService } from '../../../application/services/templates.service';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesResourceController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  getOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(requireOrganizationId(organizationId), user.userId, id, body);
  }
}
