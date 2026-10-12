import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GOOGLE_DRIVE_FILE_SCOPE } from '@agency-os/contracts';
import type { AppConfig } from '../../../shared/config/app.config';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPES = GOOGLE_DRIVE_FILE_SCOPE;

const GOOGLE_APPS_PREFIX = 'application/vnd.google-apps.';
const GOOGLE_EXPORT_MIME: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/pdf',
  'application/vnd.google-apps.spreadsheet': 'application/pdf',
  'application/vnd.google-apps.presentation': 'application/pdf',
  'application/vnd.google-apps.drawing': 'image/png',
};

export type GoogleDriveTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

export type GoogleDriveFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
};

export type GoogleDriveDownloadedFile = {
  name: string;
  mimeType: string;
  body: Buffer;
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

  isPickerConfigured(): boolean {
    return (
      this.isConfigured() &&
      Boolean(this.config.get('GOOGLE_DRIVE_API_KEY', { infer: true }))
    );
  }

  getPickerClientId(): string {
    return this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true });
  }

  getPickerApiKey(): string {
    return this.config.get('GOOGLE_DRIVE_API_KEY', { infer: true });
  }

  getPickerAppId(): string | null {
    const appId = this.config.get('GOOGLE_CLOUD_PROJECT_NUMBER', {
      infer: true,
    });
    return appId || null;
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
    return this.toTokens(json);
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleDriveTokens> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true }),
      client_secret: this.config.get('GOOGLE_DRIVE_CLIENT_SECRET', {
        infer: true,
      }),
      grant_type: 'refresh_token',
    });
    const response = await fetch(OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Drive token refresh failed: ${text}`);
      throw new Error('Google Drive token refresh failed');
    }
    const json = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const tokens = this.toTokens(json);
    return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
  }

  async getFileMetadata(
    accessToken: string,
    fileId: string,
  ): Promise<GoogleDriveFileMetadata> {
    const response = await fetch(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Drive metadata failed: ${text.slice(0, 200)}`);
    }
    const json = (await response.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
    };
    return {
      id: json.id,
      name: json.name,
      mimeType: json.mimeType,
      sizeBytes: json.size ? Number(json.size) : null,
    };
  }

  async downloadFile(
    accessToken: string,
    fileId: string,
  ): Promise<GoogleDriveDownloadedFile> {
    const metadata = await this.getFileMetadata(accessToken, fileId);
    if (metadata.mimeType.startsWith(GOOGLE_APPS_PREFIX)) {
      const exportMime = GOOGLE_EXPORT_MIME[metadata.mimeType];
      if (!exportMime) {
        throw new Error(`Unsupported Google file type: ${metadata.mimeType}`);
      }
      const response = await fetch(
        `${DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Drive export failed: ${text.slice(0, 200)}`);
      }
      const body = Buffer.from(await response.arrayBuffer());
      return {
        name: exportFileName(metadata.name, exportMime),
        mimeType: exportMime,
        body,
      };
    }

    const response = await fetch(
      `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Drive download failed: ${text.slice(0, 200)}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    return {
      name: metadata.name,
      mimeType: metadata.mimeType,
      body,
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

  private toTokens(json: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }): GoogleDriveTokens {
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }
}

function exportFileName(name: string, mimeType: string): string {
  const extension = mimeType === 'application/pdf' ? '.pdf' : '.png';
  if (name.toLowerCase().endsWith(extension)) return name;
  return `${name}${extension}`;
}
