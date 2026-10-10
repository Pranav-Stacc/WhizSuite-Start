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
import { TenancyService } from '../../../application/services/tenancy.service';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  UpdateDepartmentDto,
} from '../dto/department.dto';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get()
  @RequirePermissions(Permissions.ORG_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.tenancy.listDepartments(organizationId);
  }

  @Post()
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.createDepartment(organizationId, user.userId, dto);
  }

  @Patch(':departmentId')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.updateDepartment(
      organizationId,
      user.userId,
      departmentId,
      dto,
    );
  }

  @Delete(':departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.deleteDepartment(
      organizationId,
      user.userId,
      departmentId,
    );
  }

  @Post(':departmentId/designations')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  createDesignation(
    @Param('organizationId') organizationId: string,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: CreateDesignationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.createDesignation(
      organizationId,
      user.userId,
      departmentId,
      dto,
    );
  }
}
