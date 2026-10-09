import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { ApprovalsService } from '../../../application/services/approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalsResourceController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @RequirePermissions(Permissions.APPROVALS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.approvals.list(requireOrganizationId(organizationId));
  }

  @Get(':approvalId')
  @RequirePermissions(Permissions.APPROVALS_VIEW)
  get(
    @Param('organizationId') organizationId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvals.get(requireOrganizationId(organizationId), approvalId);
  }

  @Post()
  @RequirePermissions(Permissions.APPROVALS_CREATE)
  request(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvals.request(
      requireOrganizationId(organizationId),
      user.userId,
      body as never,
    );
  }

  @Post(':approvalId/act')
  @RequirePermissions(Permissions.APPROVALS_APPROVE)
  act(
    @Param('organizationId') organizationId: string,
    @Param('approvalId') approvalId: string,
    @Body('action') action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    @Body('comment') comment?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.approvals.act(
      requireOrganizationId(organizationId),
      user!.userId,
      approvalId,
      action,
      comment,
    );
  }
}
