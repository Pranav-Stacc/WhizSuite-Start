import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AutomationService } from '../../../application/services/automation.service';

@ApiTags('automation')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/automations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationResourceController {
  constructor(private readonly service: AutomationService) {}

  @Get()
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  getOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(requireOrganizationId(organizationId), user.userId, id, body);
  }

  @Post(':id/publish')
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  publish(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      trigger: Record<string, unknown>;
      conditions?: Record<string, unknown>;
      actions: Record<string, unknown>;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.publish(requireOrganizationId(organizationId), user.userId, id, body);
  }

  @Post(':id/run')
  @RequirePermissions(Permissions.AUTOMATIONS_MANAGE)
  run(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.run(requireOrganizationId(organizationId), user.userId, id, body);
  }
}
