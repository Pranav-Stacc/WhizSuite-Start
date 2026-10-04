import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions, ErrorCodes } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { ProblemDetailsException } from '../../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../../shared/tenant/tenant.context';
import { AuditRepository } from '../../../infrastructure/repositories/audit.repository';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('v1/audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permissions.AUDIT_VIEW)
export class AuditController {
  constructor(private readonly repository: AuditRepository) {}

  @Get()
  async list(@Query('cursor') cursor?: string, @Query('limit') limit = '20') {
    const organizationId = TenantContext.getOrganizationId();
    if (!organizationId) {
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
    return this.repository.list(organizationId, {
      cursor,
      limit: Math.min(Number(limit) || 20, 100),
    });
  }
}
