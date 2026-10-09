import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { IntegrationsService } from '../../../application/services/integrations.service';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/integrations/connections')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IntegrationsResourceController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  getOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(requireOrganizationId(organizationId), user.userId, id, body);
  }
}
