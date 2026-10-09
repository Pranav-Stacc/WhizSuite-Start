import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CalendarService } from '../../../application/services/calendar.service';
import {
  CreateCalendarItemDto,
  UpdateCalendarItemDto,
} from '../dto/calendar-item.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/calendar/items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CalendarResourceController {
  constructor(private readonly service: CalendarService) {}

  @Get()
  @RequirePermissions(Permissions.PROJECTS_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.PROJECTS_CREATE)
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
  @RequirePermissions(Permissions.PROJECTS_EDIT)
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
