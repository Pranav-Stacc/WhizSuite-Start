import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CalendarFeedService } from '../../../application/services/calendar-feed.service';
import { CalendarService } from '../../../application/services/calendar.service';
import { GoogleCalendarSyncService } from '../../../application/services/google-calendar-sync.service';
import { ShootService } from '../../../application/services/shoot.service';
import { CalendarFeedQueryDto } from '../dto/calendar-feed.dto';
import {
  CreateCalendarItemDto,
  UpdateCalendarItemDto,
} from '../dto/calendar-item.dto';
import {
  BeginGoogleCalendarConnectDto,
  PullGoogleCalendarDto,
  UpdateGoogleCalendarSettingsDto,
} from '../dto/google-calendar.dto';
import { CreateShootDto } from '../dto/shoot.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/calendar/feed')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarFeedController {
  constructor(private readonly feed: CalendarFeedService) {}

  @Get()
  @RequirePermissions(Permissions.CALENDAR_VIEW)
  list(
    @Param('organizationId') organizationId: string,
    @Query() query: CalendarFeedQueryDto,
  ) {
    return this.feed.feed(requireOrganizationId(organizationId), query);
  }
}

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/calendar/items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarResourceController {
  constructor(private readonly service: CalendarService) {}

  @Get()
  @RequirePermissions(Permissions.CALENDAR_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.CALENDAR_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateCalendarItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Patch(':id')
  @RequirePermissions(Permissions.CALENDAR_EDIT)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCalendarItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(
      requireOrganizationId(organizationId),
      user.userId,
      id,
      body,
    );
  }
}

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/calendar/shoots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarShootsController {
  constructor(private readonly shoots: ShootService) {}

  @Post()
  @RequirePermissions(Permissions.PROJECTS_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateShootDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shoots.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }
}

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/calendar/google')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GoogleCalendarController {
  constructor(private readonly sync: GoogleCalendarSyncService) {}

  @Get()
  @RequirePermissions(Permissions.CALENDAR_VIEW)
  status(@Param('organizationId') organizationId: string) {
    return this.sync.getConnection(requireOrganizationId(organizationId));
  }

  @Post('connect')
  @RequirePermissions(Permissions.CALENDAR_SYNC)
  connect(
    @Param('organizationId') organizationId: string,
    @Body() body: BeginGoogleCalendarConnectDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sync.beginConnect(
      requireOrganizationId(organizationId),
      user.userId,
      body.returnTo ?? 'web',
    );
  }

  @Patch('settings')
  @RequirePermissions(Permissions.CALENDAR_SYNC)
  updateSettings(
    @Param('organizationId') organizationId: string,
    @Body() body: UpdateGoogleCalendarSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sync.updateSettings(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post('pull')
  @RequirePermissions(Permissions.CALENDAR_SYNC)
  pull(
    @Param('organizationId') organizationId: string,
    @Body() body: PullGoogleCalendarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sync.pullFromGoogle(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Post(':connectionId/disconnect')
  @RequirePermissions(Permissions.CALENDAR_SYNC)
  disconnect(
    @Param('organizationId') organizationId: string,
    @Param('connectionId', ParseUUIDPipe) connectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sync.disconnect(
      requireOrganizationId(organizationId),
      user.userId,
      connectionId,
    );
  }
}
