import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { META_OAUTH_SCOPES } from '@agency-os/contracts';
import type { AppConfig } from '../../../shared/config/app.config';

const DIALOG_HOST = 'https://www.facebook.com';
const GRAPH_HOST = 'https://graph.facebook.com';

export type MetaTokenSet = {
  userAccessToken: string;
  expiresAt: string | null;
};

export type MetaLinkedAccount = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessAccountId: string | null;
  instagramUsername: string | null;
  instagramName: string | null;
};

@Injectable()
export class MetaClient {
  private readonly logger = new Logger(MetaClient.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('META_APP_ID', { infer: true }) &&
        this.config.get('META_APP_SECRET', { infer: true }) &&
        this.config.get('META_REDIRECT_URI', { infer: true }) &&
        this.config.get('META_LOGIN_CONFIG_ID', { infer: true }),
    );
  }

  private graphVersion(): string {
    return this.config.get('META_GRAPH_API_VERSION', { infer: true });
  }

  buildAuthorizeUrl(state: string): string {
    const configId = this.config.get('META_LOGIN_CONFIG_ID', { infer: true });
    const params = new URLSearchParams({
      client_id: this.config.get('META_APP_ID', { infer: true }),
      redirect_uri: this.config.get('META_REDIRECT_URI', { infer: true }),
      state,
      response_type: 'code',
    });
    // Business-type apps require Facebook Login for Business config_id (not scope).
    if (configId) {
      params.set('config_id', configId);
    } else {
      params.set('scope', META_OAUTH_SCOPES.join(','));
    }
    return `${DIALOG_HOST}/${this.graphVersion()}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MetaTokenSet> {
    const params = new URLSearchParams({
      client_id: this.config.get('META_APP_ID', { infer: true }),
      client_secret: this.config.get('META_APP_SECRET', { infer: true }),
      redirect_uri: this.config.get('META_REDIRECT_URI', { infer: true }),
      code,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/oauth/access_token?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta code exchange failed: ${text}`);
      throw new Error('Meta authorization failed');
    }
    const json = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    const shortLived = json.access_token;
    return this.exchangeLongLived(shortLived);
  }

  private async exchangeLongLived(shortLivedToken: string): Promise<MetaTokenSet> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.get('META_APP_ID', { infer: true }),
      client_secret: this.config.get('META_APP_SECRET', { infer: true }),
      fb_exchange_token: shortLivedToken,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/oauth/access_token?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta long-lived exchange failed: ${text}`);
      // Fall back to short-lived so connect still completes for testing.
      return { userAccessToken: shortLivedToken, expiresAt: null };
    }
    const json = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      userAccessToken: json.access_token,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  async listLinkedAccounts(userAccessToken: string): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = new URLSearchParams({
      fields,
      access_token: userAccessToken,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/me/accounts?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /me/accounts failed: ${text}`);
      throw new Error('Failed to load Facebook Pages for this account');
    }
    const json = (await response.json()) as {
      data?: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: {
          id: string;
          username?: string;
          name?: string;
        };
      }>;
    };
    return (json.data ?? []).map((page) => ({
      pageId: page.id,
      pageName: page.name,
      pageAccessToken: page.access_token,
      instagramBusinessAccountId: page.instagram_business_account?.id ?? null,
      instagramUsername: page.instagram_business_account?.username ?? null,
      instagramName: page.instagram_business_account?.name ?? null,
    }));
  }
}
