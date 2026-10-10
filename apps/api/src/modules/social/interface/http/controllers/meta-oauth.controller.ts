import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ProblemDetailsException,
} from '../../../../../shared/errors/problem-details.exception';
import { MetaOauthService } from '../../../application/services/meta-oauth.service';

/**
 * Browser OAuth redirect target for Meta — no JWT.
 * Path must match Meta Valid OAuth Redirect URI:
 * `{API}/api/platforms/callback` (global prefix `api` + controller `platforms`).
 */
@ApiTags('integrations')
@Controller('platforms')
export class MetaOauthController {
  constructor(private readonly metaOauth: MetaOauthService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(
        this.metaOauth.webFailureRedirect(errorDescription ?? error ?? 'denied'),
      );
    }
    try {
      await this.metaOauth.completeConnect({ code, state });
      return res.redirect(this.metaOauth.webSuccessRedirect());
    } catch (err) {
      const detail =
        err instanceof ProblemDetailsException
          ? (err.problem.detail ?? err.problem.title)
          : err instanceof Error
            ? err.message
            : 'failed';
      return res.redirect(this.metaOauth.webFailureRedirect(detail));
    }
  }
}
