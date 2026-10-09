import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { ErrorCodes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';

export interface VerifiedGoogleIdentity {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  pictureUrl?: string;
}

const GOOGLE_PROVIDER = 'google';

@Injectable()
export class GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isEnabled(): boolean {
    return this.config.get('GOOGLE_AUTH_ENABLED', { infer: true });
  }

  provider(): string {
    return GOOGLE_PROVIDER;
  }

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    if (!this.isEnabled()) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Available',
          status: 503,
          code: ErrorCodes.GOOGLE_AUTH_DISABLED,
          detail: 'Google sign-in is not enabled',
        },
        503,
      );
    }

    const audiences = this.config.get('GOOGLE_OAUTH_CLIENT_IDS', {
      infer: true,
    });
    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw this.invalidToken();
    }

    if (!payload?.sub || !payload.email) {
      throw this.invalidToken();
    }
    if (payload.email_verified !== true) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.GOOGLE_TOKEN_INVALID,
          detail: 'Google email is not verified',
        },
        401,
      );
    }

    return {
      providerUserId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: true,
      firstName: payload.given_name?.trim() || undefined,
      lastName: payload.family_name?.trim() || undefined,
      pictureUrl: payload.picture,
    };
  }

  private invalidToken(): ProblemDetailsException {
    return new ProblemDetailsException(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        code: ErrorCodes.GOOGLE_TOKEN_INVALID,
        detail: 'Invalid Google ID token',
      },
      401,
    );
  }
}
