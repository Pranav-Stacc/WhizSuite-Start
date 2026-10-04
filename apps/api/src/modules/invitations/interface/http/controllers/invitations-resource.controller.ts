import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { InvitationsService } from '../../../application/services/invitations.service';
import { CreateInvitationDto } from '../dto/invitation.dto';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/invitations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvitationsResourceController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  list(@Param('organizationId') organizationId: string) {
    return this.invitations.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  invite(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitations.invite(requireOrganizationId(organizationId), user.userId, dto);
  }
}

@ApiTags('invitations')
@Controller('v1/invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsPublicController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('accept')
  accept(@Body('token') token: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invitations.accept(token, user.userId);
  }
}
