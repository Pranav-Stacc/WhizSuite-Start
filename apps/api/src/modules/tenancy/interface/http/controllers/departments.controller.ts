import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { TenancyService } from '../../../application/services/tenancy.service';
import { CreateDepartmentDto } from '../dto/department.dto';

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
}
