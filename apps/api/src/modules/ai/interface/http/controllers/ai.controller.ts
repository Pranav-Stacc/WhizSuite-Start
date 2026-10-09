import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@agency-os/contracts';
import { JwtAuthGuard } from '../../../../../shared/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../../../../shared/auth/permissions.guard';
import { RequirePermissions } from '../../../../../shared/auth/permissions.decorator';
import { AiService } from '../../../application/services/ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('v1/ai')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('caption')
  @RequirePermissions(Permissions.CONTENT_CREATE)
  caption(
    @Body()
    body: {
      topic: string;
      tone?: string;
      platform?: string;
      maxLength?: number;
    },
  ) {
    return this.service.generateCaption(body);
  }

  @Post('hashtags')
  @RequirePermissions(Permissions.CONTENT_CREATE)
  hashtags(@Body() body: { topic: string; count?: number }) {
    return this.service.suggestHashtags(body);
  }

  @Post('summarize')
  @RequirePermissions(Permissions.CONTENT_VIEW)
  summarize(@Body() body: { text: string; maxSentences?: number }) {
    return this.service.summarizeText(body);
  }
}
