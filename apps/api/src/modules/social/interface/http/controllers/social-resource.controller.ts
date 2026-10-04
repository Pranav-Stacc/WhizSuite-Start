import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { CurrentUser, type AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { requireOrganizationId } from '../../../../../shared/http/org-context';
import { SocialService } from '../../../application/services/social.service';
import { CreateContentDto } from '../dto/content.dto';

@ApiTags('social')
@ApiBearerAuth()
@Controller('v1/organizations/:organizationId')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialResourceController {
  constructor(private readonly social: SocialService) {}

  @Get('content')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  listContent(
    @Param('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.social.listContent(requireOrganizationId(organizationId), clientId);
  }

  @Get('content/:contentId')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  getContent(
    @Param('organizationId') organizationId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.social.getContent(requireOrganizationId(organizationId), contentId);
  }

  @Post('content')
  @RequirePermissions(Permissions.CONTENT_CREATE)
  createContent(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.createContent(requireOrganizationId(organizationId), user.userId, dto);
  }

  @Post('content/:contentId/transition')
  @RequirePermissions(Permissions.CONTENT_EDIT)
  transition(
    @Param('organizationId') organizationId: string,
    @Param('contentId') contentId: string,
    @Body('toStatus') toStatus: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.transitionContent(
      requireOrganizationId(organizationId),
      user.userId,
      contentId,
      toStatus,
    );
  }

  @Post('content/variants/:variantId/schedule')
  @RequirePermissions(Permissions.SOCIAL_SCHEDULE)
  schedule(
    @Param('organizationId') organizationId: string,
    @Param('variantId') variantId: string,
    @Body('scheduledAt') scheduledAt: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.scheduleVariant(
      requireOrganizationId(organizationId),
      user.userId,
      variantId,
      scheduledAt,
    );
  }

  @Get('campaigns')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  listCampaigns(
    @Param('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.social.listCampaigns(requireOrganizationId(organizationId), clientId);
  }

  @Get('social-accounts')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  listAccounts(
    @Param('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.social.listAccounts(requireOrganizationId(organizationId), clientId);
  }
}
