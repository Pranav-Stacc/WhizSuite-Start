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
import { MediaFoldersService } from '../../../application/services/media-folders.service';
import {
  CreateMediaFolderDto,
  EnsureClientFoldersDto,
  ListMediaFoldersQueryDto,
  UpdateMediaFolderDto,
} from '../dto/media-folder.dto';

@ApiTags('media-folders')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/media/folders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MediaFoldersController {
  constructor(private readonly folders: MediaFoldersService) {}

  @Get()
  @RequirePermissions(Permissions.FILES_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListMediaFoldersQueryDto,
  ) {
    return this.folders.list(requireOrganizationId(organizationId), query);
  }

  @Post()
  @RequirePermissions(Permissions.FILES_UPLOAD)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateMediaFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post('ensure-client')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  ensureClient(
    @Param('organizationId') organizationId: string,
    @Body() body: EnsureClientFoldersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.ensureClientFolderTree(
      requireOrganizationId(organizationId),
      user.userId,
      body.clientId,
    );
  }

  @Patch(':folderId')
  @RequirePermissions(Permissions.FILES_UPLOAD)
  update(
    @Param('organizationId') organizationId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: UpdateMediaFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.update(
      requireOrganizationId(organizationId),
      user.userId,
      folderId,
      body,
    );
  }

  @Delete(':folderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.FILES_DELETE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.folders.remove(
      requireOrganizationId(organizationId),
      user.userId,
      folderId,
    );
  }
}
