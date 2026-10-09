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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  Permissions,
  ROLE_KIND_KEYS,
  type RoleKind,
} from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { RolesService } from '../../../application/services/roles.service';
import { AccessRepository } from '../../../infrastructure/repositories/access.repository';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesResourceController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(Permissions.ROLES_MANAGE)
  @ApiQuery({ name: 'kind', required: false, enum: ROLE_KIND_KEYS })
  list(
    @Param('organizationId') organizationId: string,
    @Query('kind') kind?: RoleKind,
  ) {
    const filter = kind && ROLE_KIND_KEYS.includes(kind) ? kind : undefined;
    return this.roles.list(requireOrganizationId(organizationId), filter);
  }

  @Post()
  @RequirePermissions(Permissions.ROLES_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roles.create(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Patch(':roleId')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roles.update(
      requireOrganizationId(organizationId),
      user.userId,
      roleId,
      dto,
    );
  }

  @Delete(':roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ROLES_MANAGE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roles.remove(
      requireOrganizationId(organizationId),
      user.userId,
      roleId,
    );
  }
}

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('v1/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsCatalogController {
  constructor(private readonly access: AccessRepository) {}

  @Get()
  list() {
    return this.access.listPermissions();
  }
}
