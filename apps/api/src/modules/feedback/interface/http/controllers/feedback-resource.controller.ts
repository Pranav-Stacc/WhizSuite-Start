import {
  Body,
  Controller,
  Get,
  Param,
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
import { FeedbackService } from '../../../application/services/feedback.service';

@ApiTags('feedback')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId/feedback/threads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeedbackResourceController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @RequirePermissions(Permissions.FEEDBACK_VIEW)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(requireOrganizationId(organizationId));
  }

  @Post()
  @RequirePermissions(Permissions.FEEDBACK_CREATE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(
      requireOrganizationId(organizationId),
      user.userId,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions(Permissions.FEEDBACK_VIEW)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.get(requireOrganizationId(organizationId), id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.FEEDBACK_CREATE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
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
