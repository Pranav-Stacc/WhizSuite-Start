import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions, type CapabilityExecuteRequest } from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { CapabilityExecutorService } from '../../../application/services/capability-executor.service';
import { CapabilityRegistryService } from '../../../application/services/capability-registry.service';

@ApiTags('capabilities')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/capabilities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CapabilitiesController {
  constructor(
    private readonly registry: CapabilityRegistryService,
    private readonly executor: CapabilityExecutorService,
  ) {}

  @Get()
  @RequirePermissions(Permissions.AI_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    requireOrganizationId(organizationId);
    return this.registry.listForUser(user.permissions ?? []);
  }

  @Post('execute')
  @RequirePermissions(Permissions.AI_CHAT)
  execute(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CapabilityExecuteRequest,
  ) {
    const orgId = requireOrganizationId(organizationId);
    return this.executor.execute(orgId, user, {
      toolId: body.toolId,
      input: body.input,
      pendingActionId: body.pendingActionId,
      idempotencyKey: body.idempotencyKey,
    });
  }
}
