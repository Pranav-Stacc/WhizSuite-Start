import { createHmac } from 'node:crypto';
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
  systemUserId: string | null;
  tokenKind: 'user' | 'system_user';
  /** Scopes present on the token (from debug_token). */
  scopes: string[];
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

type GranularScope = {
  scope?: string;
  target_ids?: Array<string | number>;
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

  private appSecretProof(accessToken: string): string {
    const secret = this.config.get('META_APP_SECRET', { infer: true });
    return createHmac('sha256', secret).update(accessToken).digest('hex');
  }

  private withAuth(
    accessToken: string,
    extra: Record<string, string> = {},
  ): URLSearchParams {
    return new URLSearchParams({
      ...extra,
      access_token: accessToken,
      appsecret_proof: this.appSecretProof(accessToken),
    });
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

    const me = await this.fetchMe(json.access_token);
    const scopes = await this.fetchTokenScopes(json.access_token);
    this.logger.log(
      `Meta token exchanged kind_hint=${me.clientBusinessId ? 'system_user' : 'user'} scopes=${scopes.join(',') || 'none'}`,
    );

    if (me.clientBusinessId) {
      // BISU tokens from Facebook Login for Business are long-lived by default.
      return {
        accessToken: json.access_token,
        expiresAt: null,
        clientBusinessId: me.clientBusinessId,
        systemUserId: me.id,
        tokenKind: 'system_user',
        scopes,
      };
    }

    const longLived = await this.exchangeLongLived(json.access_token);
    return {
      ...longLived,
      clientBusinessId: null,
      systemUserId: me.id,
      tokenKind: 'user',
      scopes,
    };
  }

  /** True when the token can list Pages (Standard or Advanced pages_show_list). */
  hasPageListingScope(tokens: MetaTokenSet): boolean {
    return tokens.scopes.includes('pages_show_list');
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

  private async fetchMe(
    accessToken: string,
  ): Promise<{ id: string | null; clientBusinessId: string | null }> {
    // Request `id` alone first — asking for `client_business_id` on a User
    // token fails the whole /me call with (#190).
    const idParams = this.withAuth(accessToken, { fields: 'id' });
    const idUrl = `${GRAPH_HOST}/${this.graphVersion()}/me?${idParams.toString()}`;
    const idResponse = await fetch(idUrl);
    let id: string | null = null;
    if (idResponse.ok) {
      const json = (await idResponse.json()) as { id?: string };
      id = json.id ?? null;
    } else {
      const text = await idResponse.text();
      this.logger.warn(`Meta /me id failed: ${text}`);
    }

    const bizParams = this.withAuth(accessToken, {
      fields: 'client_business_id',
    });
    const bizUrl = `${GRAPH_HOST}/${this.graphVersion()}/me?${bizParams.toString()}`;
    const bizResponse = await fetch(bizUrl);
    if (!bizResponse.ok) {
      // Expected for User access tokens (BISU-only field).
      return { id, clientBusinessId: null };
    }
    const bizJson = (await bizResponse.json()) as {
      client_business_id?: string;
    };
    return {
      id,
      clientBusinessId: bizJson.client_business_id ?? null,
    };
  }

  /**
   * Resolve Pages + Instagram Business accounts granted during Login for Business.
   *
   * Prefer `/me/accounts` and debug_token granular target_ids. Business
   * `owned_pages` / `client_pages` require `business_management` and often fail
   * for BISU configs that only request Pages/IG scopes.
   */
  async listLinkedAccounts(tokens: MetaTokenSet): Promise<MetaLinkedAccount[]> {
    const fromAccounts = await this.listMeAccounts(tokens.accessToken);
    if (fromAccounts.length > 0) {
      this.logger.log(
        `Meta linked accounts via /me/accounts: ${fromAccounts.length}`,
      );
      return fromAccounts;
    }

    const fromGranular = await this.listFromGranularScopes(tokens.accessToken);
    if (fromGranular.length > 0) {
      this.logger.log(
        `Meta linked accounts via debug_token targets: ${fromGranular.length}`,
      );
      return fromGranular;
    }

    if (tokens.systemUserId) {
      const assigned = await this.listAssignedPages(
        tokens.systemUserId,
        tokens.accessToken,
      );
      if (assigned.length > 0) {
        this.logger.log(
          `Meta linked accounts via assigned_pages: ${assigned.length}`,
        );
        return assigned;
      }
    }

    const businessId = tokens.clientBusinessId;
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

      const fromIg = await this.listBusinessInstagramAccounts(
        businessId,
        tokens.accessToken,
      );
      if (fromIg.length > 0) return fromIg;
    }

    this.logger.warn(
      `Meta linked accounts empty (kind=${tokens.tokenKind}, business=${businessId ?? 'none'})`,
    );
    return [];
  }

  private async listMeAccounts(
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = this.withAuth(accessToken, { fields });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/me/accounts?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /me/accounts failed: ${text}`);
      return [];
    }
    const json = (await response.json()) as { data?: GraphPage[] };
    const pages = (json.data ?? []).map((page) =>
      this.mapPage(page, accessToken),
    );
    this.logger.log(`Meta /me/accounts returned ${pages.length} page(s)`);
    return pages;
  }

  private async listAssignedPages(
    systemUserId: string,
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = this.withAuth(accessToken, { fields });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${systemUserId}/assigned_pages?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta /${systemUserId}/assigned_pages failed: ${text}`);
      return [];
    }
    const json = (await response.json()) as { data?: GraphPage[] };
    return (json.data ?? []).map((page) => this.mapPage(page, accessToken));
  }

  private async listFromGranularScopes(
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const targetIds = await this.fetchGranularTargetIds(accessToken);
    if (targetIds.length === 0) return [];

    const pages: MetaLinkedAccount[] = [];
    for (const id of targetIds) {
      const page = await this.fetchPageById(id, accessToken);
      if (page) {
        pages.push(page);
        continue;
      }
      const ig = await this.fetchInstagramAsAccount(id, accessToken);
      if (ig) pages.push(ig);
    }
    return this.dedupePages(pages);
  }

  private async debugToken(accessToken: string): Promise<{
    scopes: string[];
    targetIds: string[];
  }> {
    const appId = this.config.get('META_APP_ID', { infer: true });
    const appSecret = this.config.get('META_APP_SECRET', { infer: true });
    const params = new URLSearchParams({
      input_token: accessToken,
      access_token: `${appId}|${appSecret}`,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/debug_token?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Meta debug_token failed: ${text}`);
      return { scopes: [], targetIds: [] };
    }
    const json = (await response.json()) as {
      data?: {
        scopes?: string[];
        granular_scopes?: GranularScope[];
      };
    };
    const scopes = json.data?.scopes ?? [];
    const granular = json.data?.granular_scopes ?? [];
    const targetIds = new Set<string>();
    for (const entry of granular) {
      for (const target of entry.target_ids ?? []) {
        targetIds.add(String(target));
      }
    }
    this.logger.log(
      `Meta debug_token scopes=${scopes.join(',') || 'none'} granular=${granular.length} targets=${targetIds.size}`,
    );
    return { scopes, targetIds: [...targetIds] };
  }

  private async fetchTokenScopes(accessToken: string): Promise<string[]> {
    const { scopes } = await this.debugToken(accessToken);
    return scopes;
  }

  private async fetchGranularTargetIds(accessToken: string): Promise<string[]> {
    const { targetIds } = await this.debugToken(accessToken);
    return targetIds;
  }

  private async fetchPageById(
    pageId: string,
    accessToken: string,
  ): Promise<MetaLinkedAccount | null> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = this.withAuth(accessToken, { fields });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${pageId}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      // Not every granular target is a Page (may be IG / other asset).
      this.logger.warn(`Meta page ${pageId} lookup failed: ${text}`);
      return null;
    }
    const json = (await response.json()) as GraphPage & { error?: unknown };
    if (!json.id) return null;
    return this.mapPage(json, accessToken);
  }

  private async fetchInstagramAsAccount(
    igId: string,
    accessToken: string,
  ): Promise<MetaLinkedAccount | null> {
    const params = this.withAuth(accessToken, {
      fields: 'id,username,name',
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${igId}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      id?: string;
      username?: string;
      name?: string;
    };
    if (!json.id) return null;
    return {
      pageId: json.id,
      pageName: json.username ? `@${json.username}` : (json.name ?? json.id),
      pageAccessToken: accessToken,
      instagramBusinessAccountId: json.id,
      instagramUsername: json.username ?? null,
      instagramName: json.name ?? null,
    };
  }

  private async listBusinessPages(
    businessId: string,
    edge: 'owned_pages' | 'client_pages',
    accessToken: string,
  ): Promise<MetaLinkedAccount[]> {
    const fields =
      'id,name,access_token,instagram_business_account{id,username,name}';
    const params = this.withAuth(accessToken, { fields });
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
    const params = this.withAuth(accessToken, {
      fields: 'id,username,name',
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
      if (
        !existing ||
        (!existing.instagramBusinessAccountId &&
          page.instagramBusinessAccountId)
      ) {
        byId.set(page.pageId, page);
      }
    }
    return [...byId.values()];
  }

  /**
   * Publish a single image (or multi-image carousel) to an Instagram professional account.
   * Uses Page access token from Facebook Login for Business.
   */
  async publishInstagramFeed(input: {
    igUserId: string;
    pageAccessToken: string;
    caption: string;
    imageUrls: string[];
  }): Promise<{ platformPostId: string; permalink: string | null }> {
    if (input.imageUrls.length === 0) {
      throw new Error('Instagram feed publish requires at least one image URL');
    }

    const firstImage = input.imageUrls[0];
    if (input.imageUrls.length === 1 && firstImage) {
      const creationId = await this.createIgMediaContainer({
        igUserId: input.igUserId,
        pageAccessToken: input.pageAccessToken,
        fields: {
          image_url: firstImage,
          caption: input.caption,
        },
      });
      await this.waitForIgContainerReady({
        creationId,
        pageAccessToken: input.pageAccessToken,
      });
      return this.publishIgContainer({
        igUserId: input.igUserId,
        pageAccessToken: input.pageAccessToken,
        creationId,
      });
    }

    const childIds: string[] = [];
    for (const imageUrl of input.imageUrls) {
      const childId = await this.createIgMediaContainer({
        igUserId: input.igUserId,
        pageAccessToken: input.pageAccessToken,
        fields: {
          image_url: imageUrl,
          is_carousel_item: 'true',
        },
      });
      await this.waitForIgContainerReady({
        creationId: childId,
        pageAccessToken: input.pageAccessToken,
      });
      childIds.push(childId);
    }
    const creationId = await this.createIgMediaContainer({
      igUserId: input.igUserId,
      pageAccessToken: input.pageAccessToken,
      fields: {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: input.caption,
      },
    });
    await this.waitForIgContainerReady({
      creationId,
      pageAccessToken: input.pageAccessToken,
    });
    return this.publishIgContainer({
      igUserId: input.igUserId,
      pageAccessToken: input.pageAccessToken,
      creationId,
    });
  }

  /** Publish a Reel / video to Instagram. */
  async publishInstagramReel(input: {
    igUserId: string;
    pageAccessToken: string;
    caption: string;
    videoUrl: string;
  }): Promise<{ platformPostId: string; permalink: string | null }> {
    const creationId = await this.createIgMediaContainer({
      igUserId: input.igUserId,
      pageAccessToken: input.pageAccessToken,
      fields: {
        media_type: 'REELS',
        video_url: input.videoUrl,
        caption: input.caption,
      },
    });
    await this.waitForIgContainerReady({
      creationId,
      pageAccessToken: input.pageAccessToken,
    });
    return this.publishIgContainer({
      igUserId: input.igUserId,
      pageAccessToken: input.pageAccessToken,
      creationId,
    });
  }

  private async createIgMediaContainer(input: {
    igUserId: string;
    pageAccessToken: string;
    fields: Record<string, string>;
  }): Promise<string> {
    const params = this.withAuth(input.pageAccessToken, input.fields);
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${input.igUserId}/media`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = await response.text();
    if (!response.ok) {
      this.logger.warn(`Meta IG media container failed: ${text}`);
      throw new Error(
        `Instagram media container failed: ${text.slice(0, 300)}`,
      );
    }
    const json = JSON.parse(text) as { id?: string };
    if (!json.id) throw new Error('Instagram media container returned no id');
    return json.id;
  }

  private async waitForIgContainerReady(input: {
    creationId: string;
    pageAccessToken: string;
  }): Promise<void> {
    const maxAttempts = 40;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const params = this.withAuth(input.pageAccessToken, {
        fields: 'status_code,status',
      });
      const url = `${GRAPH_HOST}/${this.graphVersion()}/${input.creationId}?${params.toString()}`;
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        this.logger.warn(`Meta IG container status failed: ${text}`);
        throw new Error(
          `Instagram container status failed: ${text.slice(0, 300)}`,
        );
      }
      const json = JSON.parse(text) as {
        status_code?: string;
        status?: string;
      };
      const code = (json.status_code ?? json.status ?? '').toUpperCase();
      if (code === 'FINISHED' || code === 'PUBLISHED') return;
      if (code === 'ERROR' || code === 'EXPIRED') {
        throw new Error(`Instagram container failed with status ${code}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error('Instagram container processing timed out');
  }

  private async publishIgContainer(input: {
    igUserId: string;
    pageAccessToken: string;
    creationId: string;
  }): Promise<{ platformPostId: string; permalink: string | null }> {
    const params = this.withAuth(input.pageAccessToken, {
      creation_id: input.creationId,
    });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${input.igUserId}/media_publish`;
    const maxAttempts = 6;
    let lastError = '';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const text = await response.text();
      if (response.ok) {
        const json = JSON.parse(text) as { id?: string };
        if (!json.id) throw new Error('Instagram publish returned no media id');
        const permalink = await this.fetchIgPermalink(
          json.id,
          input.pageAccessToken,
        );
        return { platformPostId: json.id, permalink };
      }
      lastError = text;
      // Media still processing (9007 / 2207027) — wait and retry.
      if (isIgMediaNotReadyError(text) && attempt < maxAttempts - 1) {
        this.logger.warn(
          `Meta IG media_publish not ready (attempt ${attempt + 1}/${maxAttempts}): ${text.slice(0, 180)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 4000));
        continue;
      }
      this.logger.warn(`Meta IG media_publish failed: ${text}`);
      throw new Error(`Instagram publish failed: ${text.slice(0, 300)}`);
    }
    throw new Error(`Instagram publish failed: ${lastError.slice(0, 300)}`);
  }

  private async fetchIgPermalink(
    mediaId: string,
    pageAccessToken: string,
  ): Promise<string | null> {
    const params = this.withAuth(pageAccessToken, { fields: 'permalink' });
    const url = `${GRAPH_HOST}/${this.graphVersion()}/${mediaId}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = (await response.json()) as { permalink?: string };
    return json.permalink ?? null;
  }

  /** Best-effort revoke of the user/app authorization (ignores failures). */
  async revokeUserAuthorization(accessToken: string): Promise<void> {
    const params = this.withAuth(accessToken);
    const url = `${GRAPH_HOST}/${this.graphVersion()}/me/permissions?${params.toString()}`;
    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(
          `Meta revoke permissions failed: ${text.slice(0, 200)}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Meta revoke permissions error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function isIgMediaNotReadyError(body: string): boolean {
  return (
    body.includes('"code":9007') ||
    body.includes('"error_subcode":2207027') ||
    body.includes('Media ID is not available') ||
    body.includes('not ready to be published')
  );
}
