import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { META_OAUTH_SCOPES } from '@agency-os/contracts';
import type { AppConfig } from '../../../shared/config/app.config';

const DIALOG_HOST = 'https://www.facebook.com';
const GRAPH_HOST = 'https://graph.facebook.com';

export type MetaTokenSet = {
  /** User token or Business Integration System User (BISU) token. */
  accessToken: string;
  expiresAt: string | null;
  clientBusinessId: string | null;
  tokenKind: 'user' | 'system_user';
};

export type MetaLinkedAccount = {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramBusinessAccountId: string | null;
  instagramUsername: string | null;
  instagramName: string | null;
};

type GraphPage = {
  id: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
  };
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

    const clientBusinessId = await this.fetchClientBusinessId(json.access_token);
    if (clientBusinessId) {
      // BISU tokens from Facebook Login for Business are long-lived by default.
      return {
        accessToken: json.access_token,
        expiresAt: null,
        clientBusinessId,
        tokenKind: 'system_user',
      };
    }

    const longLived = await this.exchangeLongLived(json.access_token);
    return {
      ...longLived,
      clientBusinessId: null,
      tokenKind: 'user',
    };
  }

  private async exchangeLongLived(
    shortLivedToken: string,
  ): Promise<{ accessToken: string; expiresAt: string | null }> {
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
      return { accessToken: shortLivedToken, expiresAt: null };
    }
    const json = (await response.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      accessToken: json.access_token,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
    };
  }

  private async fetchClientBusinessId(accessToken: string): Promise<string | null> {
    const params = new URLSearchParams({
      fields: 'client_business_id',
      access_token: accessToken,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/me?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /me client_business_id failed: ${text}`);
      return null;
    }
    const json = (await response.json()) as { client_business_id?: string };
    return json.client_business_id ?? null;
  }

  /**
   * Resolve Pages + Instagram Business accounts granted during Login for Business.
   * User tokens → `/me/accounts`. System-user (BISU) tokens → business owned/client pages.
   */
  async listLinkedAccounts(tokens: MetaTokenSet): Promise<MetaLinkedAccount[]> {
    if (tokens.tokenKind === 'user') {
      const pages = await this.listMeAccounts(tokens.accessToken);
      if (pages.length > 0) return pages;
    }

    const businessId =
      tokens.clientBusinessId ?? (await this.fetchClientBusinessId(tokens.accessToken));
    if (businessId) {
      const owned = await this.listBusinessPages(
        businessId,
        'owned_pages',
        tokens.accessToken,
      );
      const client = await this.listBusinessPages(
        businessId,
        'client_pages',
        tokens.accessToken,
      );
      const merged = this.dedupePages([...owned, ...client]);
      if (merged.length > 0) return merged;

      // Fallback: Instagram accounts on the business, resolve linked Page.
      const fromIg = await this.listBusinessInstagramAccounts(
        businessId,
        tokens.accessToken,
      );
      if (fromIg.length > 0) return fromIg;
    }

    // Last resort for mixed tokens.
    return this.listMeAccounts(tokens.accessToken);
  }

  private async listMeAccounts(accessToken: string): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = new URLSearchParams({ fields, access_token: accessToken });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/me/accounts?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /me/accounts failed: ${text}`);
      return [];
    }
    const json = (await response.json()) as { data?: GraphPage[] };
    return (json.data ?? []).map((page) => this.mapPage(page, accessToken));
  }

  private async listBusinessPages(
    businessId: string,
    edge: 'owned_pages' | 'client_pages',
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = new URLSearchParams({ fields, access_token: accessToken });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${businessId}/${edge}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /${businessId}/${edge} failed: ${text}`);
      return [];
    }
    const json = (await response.json()) as { data?: GraphPage[] };
    return (json.data ?? []).map((page) => this.mapPage(page, accessToken));
  }

  private async listBusinessInstagramAccounts(
    businessId: string,
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const params = new URLSearchParams({
      fields: 'id,username,name',
      access_token: accessToken,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${businessId}/instagram_business_accounts?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(
        `Meta /${businessId}/instagram_business_accounts failed: ${text}`,
      );
      return [];
    }
    const json = (await response.json()) as {
      data?: Array<{ id: string; username?: string; name?: string }>;
    };
    return (json.data ?? []).map((ig) => ({
      pageId: ig.id,
      pageName: ig.username ? `@${ig.username}` : (ig.name ?? ig.id),
      pageAccessToken: accessToken,
      instagramBusinessAccountId: ig.id,
      instagramUsername: ig.username ?? null,
      instagramName: ig.name ?? null,
    }));
  }

  private mapPage(page: GraphPage, fallbackToken: string): MetaLinkedAccount {
    return {
      pageId: page.id,
      pageName: page.name ?? page.id,
      // BISU may omit per-page tokens; the system-user token is valid for granted assets.
      pageAccessToken: page.access_token ?? fallbackToken,
      instagramBusinessAccountId: page.instagram_business_account?.id ?? null,
      instagramUsername: page.instagram_business_account?.username ?? null,
      instagramName: page.instagram_business_account?.name ?? null,
    };
  }

  private dedupePages(pages: MetaLinkedAccount[]): MetaLinkedAccount[] {
    const byId = new Map<string, MetaLinkedAccount>();
    for (const page of pages) {
      const existing = byId.get(page.pageId);
      if (!existing || (!existing.instagramBusinessAccountId && page.instagramBusinessAccountId)) {
        byId.set(page.pageId, page);
      }
    }
    return [...byId.values()];
  }
}
