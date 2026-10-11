import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppConfig } from '../../../../../shared/config/app.config';
import { googleCalendarOAuthReturnUrl } from '../../../../../shared/integrations/oauth-return-url';
import { GoogleCalendarSyncService } from '../../../application/services/google-calendar-sync.service';
import { Public } from '../../../../../shared/auth/public-route.decorator';

/** OAuth redirect target for Google Calendar connect — no JWT (browser redirect). */
@ApiTags('integrations')
@Public()
@Controller('v1/integrations/google-calendar')
export class GoogleCalendarOauthController {
  constructor(
    private readonly sync: GoogleCalendarSyncService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(
        googleCalendarOAuthReturnUrl(this.config, state, 'error'),
      );
    }
    try {
      await this.sync.completeConnect({ code, state });
      return res.redirect(
        googleCalendarOAuthReturnUrl(this.config, state, 'connected'),
      );
    } catch {
      return res.redirect(
        googleCalendarOAuthReturnUrl(this.config, state, 'error'),
      );
    }
  }
}
