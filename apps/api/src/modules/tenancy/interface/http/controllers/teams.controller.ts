import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { CreateTeamDto } from '../dto/team.dto';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get()
  @RequirePermissions(Permissions.ORG_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.tenancy.listTeams(organizationId);
  }

  @Post()
  @RequirePermissions(Permissions.ORG_SETTINGS_MANAGE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenancy.createTeam(organizationId, user.userId, dto);
  }
}
