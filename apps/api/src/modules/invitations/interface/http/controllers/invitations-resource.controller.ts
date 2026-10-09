import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { InvitationsService } from '../../../application/services/invitations.service';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
  InvitationTokenQuery,
  RedeemInvitationDto,
} from '../dto/invitation.dto';

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
    return this.invitations.invite(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitations.revoke(
      requireOrganizationId(organizationId),
      user.userId,
      invitationId,
    );
  }
}

@ApiTags('invitations')
@Controller('v1/invitations')
export class InvitationsPublicController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get('preview')
  preview(@Query() query: InvitationTokenQuery) {
    return this.invitations.preview(query.token);
  }

  @Post('redeem')
  redeem(@Body() dto: RedeemInvitationDto) {
    return this.invitations.redeem(dto);
  }

  @Post('accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  accept(
    @Body() dto: AcceptInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitations.accept(dto.token, user);
  }
}
