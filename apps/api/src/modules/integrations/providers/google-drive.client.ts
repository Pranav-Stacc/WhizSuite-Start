import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../shared/config/app.config';

const DRIVE_UPLOAD =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export type GoogleDriveTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

@Injectable()
export class GoogleDriveClient {
  private readonly logger = new Logger(GoogleDriveClient.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true }) &&
        this.config.get('GOOGLE_DRIVE_CLIENT_SECRET', { infer: true }) &&
        this.config.get('GOOGLE_DRIVE_REDIRECT_URI', { infer: true }),
    );
  }

  buildAuthorizeUrl(state: string): string {
    const clientId = this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true });
    const redirectUri = this.config.get('GOOGLE_DRIVE_REDIRECT_URI', {
      infer: true,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: DRIVE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${OAUTH_AUTH}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleDriveTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true }),
      client_secret: this.config.get('GOOGLE_DRIVE_CLIENT_SECRET', {
        infer: true,
      }),
      redirect_uri: this.config.get('GOOGLE_DRIVE_REDIRECT_URI', {
        infer: true,
      }),
      grant_type: 'authorization_code',
    });
    const response = await fetch(OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Drive token exchange failed: ${text}`);
      throw new Error('Google Drive authorization failed');
    }
    const json = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  async uploadFile(input: {
    accessToken: string;
    name: string;
    mimeType: string;
    body: Buffer;
    folderId?: string;
  }): Promise<void> {
    const metadata: Record<string, unknown> = {
      name: input.name,
      mimeType: input.mimeType,
    };
    if (input.folderId) metadata.parents = [input.folderId];

    const boundary = `ao_${Date.now()}`;
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([preamble, input.body, epilogue]);

    const response = await fetch(DRIVE_UPLOAD, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': `multipart/related; boundary=${boundary}`,
        'content-length': String(body.byteLength),
      },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Drive upload failed: ${text.slice(0, 200)}`);
    }
  }
}
