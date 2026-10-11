import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  MembershipTypes,
  type AccessCapabilities,
  type MembershipType,
} from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { AllowAuthenticated } from '../../../../../shared/auth/allow-authenticated.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AuthorizationService } from '../../../application/services/authorization.service';
import { AccessRepository } from '../../../infrastructure/repositories/access.repository';

function membershipTypeOf(
  value: string | undefined,
): MembershipType | undefined {
  return MembershipTypes.find((type) => type === value);
}

@ApiTags('access')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('v1/access')
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly access: AccessRepository,
  ) {}

  /** `capabilities` mirrors `permissions` as a lookup map for clients that expect it. */
  @Get('capabilities')
  async capabilities(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccessCapabilities & { capabilities: Record<string, boolean> }> {
    const orgId = requireOrganizationId(user.organizationId);
    if (!user.membershipId) {
      return { permissions: [], roles: [], capabilities: {} };
    }
    const [permissions, rolesByMembership] = await Promise.all([
      this.authorization.getEffectivePermissions(orgId, user.membershipId),
      this.access.rolesByMembership(orgId, [user.membershipId]),
    ]);
    return {
      membershipType: membershipTypeOf(user.membershipType),
      permissions,
      roles: rolesByMembership.get(user.membershipId) ?? [],
      capabilities: Object.fromEntries(permissions.map((p) => [p, true])),
    };
  }
}
