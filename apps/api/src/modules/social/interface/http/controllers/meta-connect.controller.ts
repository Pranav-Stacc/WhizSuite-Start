import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { MetaOauthService } from '../../../application/services/meta-oauth.service';

class BeginMetaConnectDto {
  @IsUUID()
  clientId!: string;

  @IsIn(['instagram', 'facebook'])
  platform: 'instagram' | 'facebook' = 'instagram';

  @IsOptional()
  @IsIn(['mobile', 'web'])
  returnTo?: 'mobile' | 'web';
}

class DisconnectMetaDto {
  @IsUUID()
  socialAccountId!: string;
}

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/integrations/meta')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MetaConnectController {
  constructor(private readonly metaOauth: MetaOauthService) {}

  @Post('connect')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  begin(
    @Param('organizationId') organizationId: string,
    @Body() body: BeginMetaConnectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.metaOauth.beginConnect({
      organizationId: requireOrganizationId(organizationId),
      actorId: user.userId,
      clientId: body.clientId,
      platform: body.platform,
      returnTo: body.returnTo ?? 'web',
    });
  }

  @Post('disconnect')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  disconnect(
    @Param('organizationId') organizationId: string,
    @Body() body: DisconnectMetaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.metaOauth.disconnectAccount({
      organizationId: requireOrganizationId(organizationId),
      actorId: user.userId,
      socialAccountId: body.socialAccountId,
    });
  }
}
