import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { IdentityRepository } from '../../../infrastructure/repositories/identity.repository';

@ApiTags('members')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly identity: IdentityRepository) {}

  @Get()
  @RequirePermissions(Permissions.MEMBERS_VIEW)
  async list(@Param('organizationId') organizationId: string) {
    const rows = await this.identity.listOrganizationMembers(
      requireOrganizationId(organizationId),
    );
    return rows.map(({ membership, user }) => ({
      id: user.id,
      membershipId: membership.id,
      email: user.email,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatarUrl: user.avatarUrl,
      membershipType: membership.type,
      status: membership.status,
      createdAt: membership.createdAt,
    }));
  }
}
