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
  Put,
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
import { MembersService } from '../../../application/services/members.service';
import { AssignMemberRolesDto, UpdateMemberDto } from '../dto/member.dto';

@ApiTags('members')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermissions(Permissions.MEMBERS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.members.list(requireOrganizationId(organizationId));
  }

  @Patch(':userId')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.changeType(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      dto.membershipType,
    );
  }

  @Put(':userId/roles')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  assignRoles(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignMemberRolesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.assignRoles(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      dto.roleIds,
      dto.scopes,
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.MEMBERS_DEACTIVATE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.deactivate(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
    );
  }
}
