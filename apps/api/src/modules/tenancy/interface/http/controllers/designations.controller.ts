import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateDesignationDto } from '../dto/department.dto';

@ApiTags('designations')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/designations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DesignationsController {
  constructor(private readonly tenancy: TenancyService) {}

  @Patch(':designationId')
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('designationId', ParseUUIDPipe) designationId: string,
    @Body() dto: UpdateDesignationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.updateDesignation(
      organizationId,
      user.userId,
      designationId,
      dto,
    );
  }

  @Delete(':designationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('designationId', ParseUUIDPipe) designationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.deleteDesignation(
      organizationId,
      user.userId,
      designationId,
    );
  }
}
