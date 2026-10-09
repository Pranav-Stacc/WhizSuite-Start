import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppConfig } from '../../../../../shared/config/app.config';
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
    const webOrigin = this.config.get('WEB_APP_URL', { infer: true });
    const successPath = `${webOrigin}/settings?tab=storage&drive=connected`;
    const failurePath = `${webOrigin}/settings?tab=storage&drive=error`;

    if (error || !code || !state) {
      return res.redirect(failurePath);
    }
    try {
      await this.dataSources.completeGoogleDriveConnect({ code, state });
      return res.redirect(successPath);
    } catch {
      return res.redirect(failurePath);
    }
  }
}
