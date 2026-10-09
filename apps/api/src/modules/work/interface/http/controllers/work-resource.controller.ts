import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { WorkService } from '../../../application/services/work.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';

@ApiTags('work')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkResourceController {
  constructor(private readonly service: WorkService) {}

  @Get()
  @RequirePermissions(Permissions.PROJECTS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.PROJECTS_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.PROJECTS_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.PROJECTS_CREATE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      dto,
    );
  }
}
