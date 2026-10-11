import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { MediaDataSourcesService } from '../../../application/services/media-data-sources.service';
import { MediaExportService } from '../../../application/services/media-export.service';
import { MediaStorageService } from '../../../application/services/media-storage.service';
import {
  BeginGoogleDriveConnectDto,
  CreateMediaDriveTransferDto,
  CreateMediaZipExportDto,
} from '../dto/media-storage.dto';

@ApiTags('media')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/media')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaStorageController {
  constructor(
    private readonly storage: MediaStorageService,
    private readonly exports: MediaExportService,
    private readonly dataSources: MediaDataSourcesService,
  ) {}

  @Get('storage-usage')
  @RequirePermissions(Permissions.FILES_VIEW)
  usage(@Param('organizationId') organizationId: string) {
    return this.storage.usage(requireOrganizationId(organizationId));
  }

  @Get('data-sources')
  @RequirePermissions(Permissions.FILES_VIEW)
  listSources(@Param('organizationId') organizationId: string) {
    return this.dataSources.list(requireOrganizationId(organizationId));
  }

  @Post('data-sources/google-drive/connect')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  connectDrive(
    @Param('organizationId') organizationId: string,
    @Body() body: BeginGoogleDriveConnectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataSources.beginGoogleDriveConnect(
      requireOrganizationId(organizationId),
      user.userId,
      body.returnTo ?? 'web',
    );
  }

  @Post('data-sources/google-drive/:connectionId/disconnect')
  @RequirePermissions(Permissions.INTEGRATIONS_MANAGE)
  disconnectDrive(
    @Param('organizationId') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataSources.disconnectGoogleDrive(
      requireOrganizationId(organizationId),
      user.userId,
      connectionId,
    );
  }

  @Post('exports/zip')
  @RequirePermissions(Permissions.FILES_VIEW)
  zip(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateMediaZipExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exports.enqueueZip(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post('exports/drive')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  driveTransfer(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateMediaDriveTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exports.enqueueDriveTransfer(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get('exports/:jobId')
  @RequirePermissions(Permissions.FILES_VIEW)
  exportJob(
    @Param('organizationId') organizationId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.exports.getJob(requireOrganizationId(organizationId), jobId);
  }
}
