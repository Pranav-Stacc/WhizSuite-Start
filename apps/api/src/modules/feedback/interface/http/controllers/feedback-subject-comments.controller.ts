import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import {
  CreateFeedbackCommentDto,
  FeedbackSubjectParamsDto,
} from '../dto/feedback-comment.dto';

@ApiTags('feedback')
@ApiBearerAuth()
@Controller(
  'v1/organizations/:organizationId/feedback/subjects/:subjectType/:subjectId/comments',
)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeedbackSubjectCommentsController {
  constructor(private readonly service: FeedbackService) {}

  @Get()
  @RequirePermissions(Permissions.FEEDBACK_VIEW)
  list(@Param() params: FeedbackSubjectParamsDto) {
    return this.service.listSubjectComments(
      requireOrganizationId(params.organizationId),
      {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
      },
    );
  }

  @Post()
  @RequirePermissions(Permissions.FEEDBACK_CREATE)
  create(
    @Param() params: FeedbackSubjectParamsDto,
    @Body() dto: CreateFeedbackCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.addSubjectComment(
      requireOrganizationId(params.organizationId),
      user.userId,
      { subjectType: params.subjectType, subjectId: params.subjectId },
      dto.body,
    );
  }
}
