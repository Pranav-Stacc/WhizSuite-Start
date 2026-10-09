import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  NotificationTypeKeys,
  type NotificationTypeKey,
} from '@agency-os/contracts';
import { UpdateNotificationPreferenceDto } from '../dto/notification-preference.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { NotificationsService } from '../../../application/services/notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsResourceController {
  constructor(private readonly notifications: NotificationsService) {}

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
      dto.enabled,
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
