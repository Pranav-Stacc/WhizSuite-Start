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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Permissions,
  type MemberPermissionOverride,
} from '@agency-os/contracts';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { MembersService } from '../../../application/services/members.service';
import {
  AssignMemberRolesDto,
  CreateMemberDocumentDto,
  SetMemberDesignationsDto,
  SetMemberPermissionsDto,
  UpdateMemberDto,
  UpdateMemberEmploymentDto,
  UpdateMemberProfileDto,
} from '../dto/member.dto';

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

  @Put(':userId/designations')
  @RequirePermissions(Permissions.MEMBERS_EDIT)
  setDesignations(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetMemberDesignationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.setDesignations(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      dto.designationIds,
      dto.primaryId,
    );
  }

  @Get(':userId/documents')
  @RequirePermissions(Permissions.MEMBERS_VIEW)
  listDocuments(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.members.listDocuments(
      requireOrganizationId(organizationId),
      userId,
    );
  }

  @Post(':userId/documents')
  @RequirePermissions(Permissions.MEMBERS_EDIT)
  sendDocument(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateMemberDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.sendDocument(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      dto,
    );
  }

  @Patch(':userId/employment')
  @RequirePermissions(Permissions.MEMBERS_EDIT)
  updateEmployment(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberEmploymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const employmentType =
      dto.employmentType === undefined
        ? undefined
        : (dto.employmentType ?? null);
    if (employmentType === undefined) {
      return { id: userId };
    }
    return this.members.updateEmployment(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      employmentType,
    );
  }

  @Patch(':userId/profile')
  @RequirePermissions(Permissions.MEMBERS_EDIT)
  updateProfile(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const title =
      typeof dto.title === 'string' ? dto.title.trim() || null : null;
    return this.members.updateProfile(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      title,
    );
  }

  @Get(':userId/access')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  getAccess(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.members.getAccess(
      requireOrganizationId(organizationId),
      userId,
    );
  }

  @Put(':userId/permissions')
  @RequirePermissions(Permissions.ROLES_MANAGE)
  setPermissions(
    @Param('organizationId') organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetMemberPermissionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.setPermissions(
      requireOrganizationId(organizationId),
      user.userId,
      userId,
      dto.overrides as MemberPermissionOverride[],
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
