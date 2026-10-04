import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AnalyticsService } from '../../../application/services/analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/analytics/metrics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsResourceController {
  constructor(private readonly service: AnalyticsService) {}

  @Get()
  @RequirePermissions(Permissions.REPORTS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.REPORTS_VIEW)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }
}
