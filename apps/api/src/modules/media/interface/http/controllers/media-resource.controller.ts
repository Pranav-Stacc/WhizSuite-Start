import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { MediaService } from '../../../application/services/media.service';

@ApiTags('media')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/media/assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaResourceController {
  constructor(private readonly service: MediaService) {}

  @Get()
  @RequirePermissions(Permissions.FILES_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post('presign')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  presign(
    @Param('organizationId') organizationId: string,
    @Body() body: { filename: string; mimeType: string; sizeBytes: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createPresignedUpload(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post()
  @RequirePermissions(Permissions.FILES_UPLOAD)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(requireOrganizationId(organizationId), user.userId, body);
  }

  @Get(':id')
  @RequirePermissions(Permissions.FILES_VIEW)
  getOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(requireOrganizationId(organizationId), user.userId, id, body);
  }
}
