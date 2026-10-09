import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { BillingService } from '../../../application/services/billing.service';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingResourceController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @RequirePermissions(Permissions.ORG_BILLING_MANAGE)
  getSubscription(@Param('organizationId') organizationId: string) {
    return this.billing.getSubscription(requireOrganizationId(organizationId));
  }

  @Get('plans')
  @RequirePermissions(Permissions.ORG_BILLING_MANAGE)
  listPlans(@Param('organizationId') organizationId: string) {
    requireOrganizationId(organizationId);
    return this.billing.listPlans();
  }
}
