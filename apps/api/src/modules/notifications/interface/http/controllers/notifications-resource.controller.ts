import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
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

  @Patch(':notificationId/read')
  markRead(
    @Param('organizationId') organizationId: string,
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.markRead(
      requireOrganizationId(organizationId),
      notificationId,
      user.userId,
    );
  }
}
