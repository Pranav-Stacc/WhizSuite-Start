import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { IsIn, IsUUID } from 'class-validator';
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
    });
  }
}
