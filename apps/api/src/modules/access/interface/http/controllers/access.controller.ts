import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AuthorizationService } from '../../../application/services/authorization.service';

@ApiTags('access')
@ApiBearerAuth()
@Controller('v1/access')
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get('capabilities')
  async capabilities(@CurrentUser() user: AuthenticatedUser) {
    const orgId = requireOrganizationId(user.organizationId);
    if (!user.membershipId) return { capabilities: {} };

    const permissions = await this.authorization.getEffectivePermissions(
      orgId,
      user.membershipId,
    );
    const capabilities = await this.authorization.getCapabilities(
      orgId,
      user.membershipId,
      permissions,
    );
    return { permissions, capabilities };
  }
}
