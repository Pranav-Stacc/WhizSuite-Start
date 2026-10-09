import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
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
import { TimeService } from '../../../application/services/time.service';
import { StartTimerDto } from '../dto/time-entry.dto';

@ApiTags('time')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/time/timer')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimerController {
  constructor(private readonly service: TimeService) {}

  @Get()
  @RequirePermissions(Permissions.TIME_TRACK)
  current(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.runningTimer(
      requireOrganizationId(organizationId),
      user,
    );
  }

  @Post('start')
  @RequirePermissions(Permissions.TIME_TRACK)
  start(
    @Param('organizationId') organizationId: string,
    @Body() dto: StartTimerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.startTimer(
      requireOrganizationId(organizationId),
      user,
      dto.taskId,
    );
  }

  @Post('stop')
  @RequirePermissions(Permissions.TIME_TRACK)
  stop(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.stopTimer(requireOrganizationId(organizationId), user);
  }
}
