import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { MediaService } from '../../../application/services/media.service';
import {
  MediaDownloadQueryDto,
  PresignMediaUploadDto,
  UpdateMediaAssetDto,
} from '../dto/media.dto';

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
    @Body() body: PresignMediaUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createPresignedUpload(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permissions.FILES_UPLOAD)
  complete(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.completeUpload(
      requireOrganizationId(organizationId),
      user.userId,
      id,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.FILES_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Get(':id/download-url')
  @RequirePermissions(Permissions.FILES_VIEW)
  downloadUrl(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MediaDownloadQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createDownloadUrl(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      query.disposition ?? 'inline',
    );
  }

  @Patch(':id')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateMediaAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      body,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.FILES_DELETE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(
      requireOrganizationId(organizationId),
      user.userId,
      id,
    );
  }
}
