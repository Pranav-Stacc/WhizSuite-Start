import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { SocialService } from '../../../application/services/social.service';
import {
  CreateContentDto,
  ListContentQueryDto,
  ReorderContentDto,
  ReviewContentDto,
  TransitionContentDto,
  UpdateContentDto,
} from '../dto/content.dto';

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
    @Query() query: ListContentQueryDto,
  ) {
    return this.social.listContent(
      requireOrganizationId(organizationId),
      query,
    );
  }

  @Post('content')
  @RequirePermissions(Permissions.CONTENT_CREATE)
  createContent(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.createContent(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Post('content/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CONTENT_EDIT)
  reorderContent(
    @Param('organizationId') organizationId: string,
    @Body() dto: ReorderContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.reorderContent(
      requireOrganizationId(organizationId),
      user.userId,
      dto,
    );
  }

  @Get('content/:contentId')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  getContent(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.social.getContent(
      requireOrganizationId(organizationId),
      contentId,
    );
  }

  @Get('content/:contentId/approval-summary')
  @RequirePermissions(Permissions.APPROVALS_VIEW)
  contentApprovalSummary(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.social.contentApprovalSummary(
      requireOrganizationId(organizationId),
      contentId,
    );
  }

  @Patch('content/:contentId')
  @RequirePermissions(Permissions.CONTENT_EDIT)
  updateContent(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.updateContent(
      requireOrganizationId(organizationId),
      user.userId,
      contentId,
      dto,
    );
  }

  @Delete('content/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permissions.CONTENT_DELETE)
  deleteContent(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.deleteContent(
      requireOrganizationId(organizationId),
      user.userId,
      contentId,
    );
  }

  @Post('content/:contentId/review')
  @RequirePermissions(Permissions.APPROVALS_APPROVE)
  review(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: ReviewContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.reviewContent(
      requireOrganizationId(organizationId),
      user.userId,
      contentId,
      dto.toStatus,
    );
  }

  @Post('content/:contentId/transition')
  @RequirePermissions(Permissions.CONTENT_EDIT)
  transition(
    @Param('organizationId') organizationId: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: TransitionContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.social.transitionContent(
      requireOrganizationId(organizationId),
      user.userId,
      contentId,
      dto.toStatus,
      { livePublish: dto.livePublish },
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
    return this.social.listCampaigns(
      requireOrganizationId(organizationId),
      clientId,
    );
  }

  @Get('social-accounts')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  listAccounts(
    @Param('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.social.listAccounts(
      requireOrganizationId(organizationId),
      clientId,
    );
  }
}
