import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppConfig } from '../../../../../shared/config/app.config';
import { googleDriveOAuthReturnUrl } from '../../../../../shared/integrations/oauth-return-url';
import { MediaDataSourcesService } from '../../../application/services/media-data-sources.service';

/** OAuth redirect target for Google Drive connect — no JWT (browser redirect). */
@ApiTags('integrations')
@Controller('v1/integrations/google-drive')
export class GoogleDriveOauthController {
  constructor(
    private readonly dataSources: MediaDataSourcesService,
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
        googleDriveOAuthReturnUrl(this.config, state, 'error'),
      );
    }
    try {
      await this.dataSources.completeGoogleDriveConnect({ code, state });
      return res.redirect(
        googleDriveOAuthReturnUrl(this.config, state, 'connected'),
      );
    } catch {
      return res.redirect(
        googleDriveOAuthReturnUrl(this.config, state, 'error'),
      );
    }
  }
}
