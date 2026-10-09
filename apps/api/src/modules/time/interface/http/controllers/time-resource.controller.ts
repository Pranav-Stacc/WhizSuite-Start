import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { TimeService } from '../../../application/services/time.service';
import { CreateTimeEntryDto } from '../dto/time-entry.dto';

@ApiTags('time')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/time/entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TimeResourceController {
  constructor(private readonly service: TimeService) {}

  @Get()
  @RequirePermissions(Permissions.TIME_TRACK)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.TIME_TRACK)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: CreateTimeEntryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.TIME_TRACK)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.TIME_TRACK)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(requireOrganizationId(organizationId), user, id);
  }
}
