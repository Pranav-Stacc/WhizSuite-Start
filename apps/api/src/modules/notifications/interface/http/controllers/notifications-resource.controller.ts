import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  NotificationTypeKeys,
  type NotificationTypeKey,
} from '@agency-os/contracts';
import { AllowAuthenticated } from '../../../../../shared/auth/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { DevicesService } from '../../../application/services/devices.service';
import { NotificationsService } from '../../../application/services/notifications.service';
import { RegisterDeviceDto } from '../dto/device.dto';
import { UpdateNotificationPreferenceDto } from '../dto/notification-preference.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/notifications')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class NotificationsResourceController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly devices: DevicesService,
  ) {}

  @Get()
  list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.list(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Get('preferences')
  preferences(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.preferences(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Put('preferences/:typeKey')
  setPreference(
    @Param('organizationId') organizationId: string,
    @Param('typeKey', new ParseEnumPipe(NotificationTypeKeys))
    typeKey: NotificationTypeKey,
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.setPreference(
      requireOrganizationId(organizationId),
      user.userId,
      typeKey,
      dto,
    );
  }

  @Get('devices')
  listDevices(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.list(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Post('devices')
  registerDevice(
    @Param('organizationId') organizationId: string,
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.register(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Delete('devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDevice(
    @Param('organizationId') organizationId: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devices.remove(
      requireOrganizationId(organizationId),
      user.userId,
      deviceId,
    );
  }

  @Patch('read-all')
  markAllRead(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.markAllRead(
      requireOrganizationId(organizationId),
      user.userId,
    );
  }

  @Patch(':notificationId/read')
  markRead(
    @Param('organizationId') organizationId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.markRead(
      requireOrganizationId(organizationId),
      notificationId,
      user.userId,
    );
  }
}
