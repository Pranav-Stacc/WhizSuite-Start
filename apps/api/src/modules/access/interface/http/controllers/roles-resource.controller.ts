import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ErrorCodes, Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { ProblemDetailsException } from '../../../../../shared/errors/problem-details.exception';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { AccessRepository } from '../../../infrastructure/repositories/access.repository';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesResourceController {
  constructor(private readonly access: AccessRepository) {}

  @Get()
  @RequirePermissions(Permissions.ROLES_MANAGE)
  list(@Param('organizationId') organizationId: string) {
    return this.access.listRoles(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.ROLES_MANAGE)
  create(@Param('organizationId') organizationId: string, @Body() dto: CreateRoleDto) {
    return this.access.createRole(requireOrganizationId(organizationId), dto);
  }

  @Patch(':roleId')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  async update(
    @Param('organizationId') organizationId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const orgId = requireOrganizationId(organizationId);
    const role = await this.access.updateRole(orgId, roleId, dto);
    if (!role) {
      throw new ProblemDetailsException(
        { type: 'about:blank', title: 'Not Found', status: 404, code: ErrorCodes.NOT_FOUND },
        404,
      );
    }
    return role;
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
