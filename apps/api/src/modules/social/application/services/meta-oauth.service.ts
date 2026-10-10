import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  META_PROVIDER_KEY,
  type Platform,
} from '@agency-os/contracts';
import { createHash, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  problem,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { IntegrationsRepository } from '../../../integrations/infrastructure/repositories/integrations.repository';
import { MetaClient } from '../../../integrations/providers/meta.client';
import { SocialRepository } from '../../infrastructure/repositories/social.repository';

type OAuthState = {
  organizationId: string;
  clientId: string;
  actorId: string;
  platform: Platform;
  nonce: string;
};

@Injectable()
export class MetaOauthService {
  constructor(
    private readonly meta: MetaClient,
    private readonly integrations: IntegrationsRepository,
    private readonly social: SocialRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async beginConnect(input: {
    organizationId: string;
    actorId: string;
    clientId: string;
    platform: 'instagram' | 'facebook';
  }): Promise<{ authorizeUrl: string }> {
    if (!this.meta.isConfigured()) {
      throw problem(
        503,
        'Service Unavailable',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Meta OAuth is not configured (META_APP_ID / META_APP_SECRET / META_REDIRECT_URI / META_LOGIN_CONFIG_ID)',
      );
    }

    const provider = await this.integrations.findProviderByKey(META_PROVIDER_KEY);
    if (!provider) {
      throw unprocessable('Meta provider is not seeded');
    }

    const existing = await this.integrations.findByProviderKeyAndClient(
      input.organizationId,
      META_PROVIDER_KEY,
      input.clientId,
    );
    let connectionId = existing?.id;
    if (!connectionId) {
      const created = await this.integrations.create(input.organizationId, {
        providerId: provider.id,
        clientId: input.clientId,
        status: 'PENDING',
        metadata: { platform: input.platform },
      });
      connectionId = created.id;
    } else {
      await this.integrations.update(input.organizationId, connectionId, {
        status: 'PENDING',
        metadata: { platform: input.platform },
      });
    }

    const state = Buffer.from(
      JSON.stringify({
        organizationId: input.organizationId,
        clientId: input.clientId,
        actorId: input.actorId,
        platform: input.platform,
        nonce: randomBytes(16).toString('hex'),
        connectionId,
      } satisfies OAuthState & { connectionId: string }),
    ).toString('base64url');

    await this.audit.record({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorType: 'user',
      action: 'social/meta.connect_start',
      entityType: 'integrationConnection',
      entityId: connectionId,
      after: { clientId: input.clientId, platform: input.platform },
    });

    return { authorizeUrl: this.meta.buildAuthorizeUrl(state) };
  }

  async completeConnect(input: {
    code: string;
    state: string;
  }): Promise<{ organizationId: string; clientId: string }> {
    const parsed = parseState(input.state);
    const tokens = await this.meta.exchangeCode(input.code);
    const pages = await this.meta.listLinkedAccounts(tokens);

    const withInstagram = pages.filter((p) => p.instagramBusinessAccountId);
    const selected =
      parsed.platform === 'instagram'
        ? withInstagram[0] ?? pages[0]
        : pages[0] ?? withInstagram[0];

    if (!selected) {
      const scopeList = tokens.scopes.join(', ') || 'none';
      if (!this.meta.hasPageListingScope(tokens)) {
        throw unprocessable(
          `Meta token missing Page permissions (got: ${scopeList}). In Business Settings → Integrations → Connected apps, remove Whiz, then Connect again and approve Pages + Instagram (and all requested permissions).`,
        );
      }
      throw unprocessable(
        tokens.tokenKind === 'system_user'
          ? 'Business connected, but no Page/Instagram assets were granted. In Meta Login, select the Facebook Page and linked Instagram professional account (not only the Business portfolio).'
          : 'No Facebook Page found. The Meta user must administer a Page (and an Instagram Business account for Instagram connect).',
      );
    }

    const provider = await this.integrations.findProviderByKey(META_PROVIDER_KEY);
    if (!provider) throw unprocessable('Meta provider is not seeded');

    const existing = await this.integrations.findByProviderKeyAndClient(
      parsed.organizationId,
      META_PROVIDER_KEY,
      parsed.clientId,
    );
    const connectionId =
      existing?.id ??
      (
        await this.integrations.create(parsed.organizationId, {
          providerId: provider.id,
          clientId: parsed.clientId,
          status: 'PENDING',
        })
      ).id;

    const encryptedData = JSON.stringify({
      accessToken: tokens.accessToken,
      tokenKind: tokens.tokenKind,
      clientBusinessId: tokens.clientBusinessId,
      // Keep legacy key for older readers.
      userAccessToken: tokens.accessToken,
      pageAccessToken: selected.pageAccessToken,
      pageId: selected.pageId,
      instagramBusinessAccountId: selected.instagramBusinessAccountId,
      fingerprint: createHash('sha256')
        .update(selected.pageAccessToken)
        .digest('hex')
        .slice(0, 12),
    });

    await this.integrations.upsertCredential(
      parsed.organizationId,
      connectionId,
      encryptedData,
      tokens.expiresAt ? new Date(tokens.expiresAt) : null,
    );
    await this.integrations.update(parsed.organizationId, connectionId, {
      status: 'CONNECTED',
      metadata: {
        connectedAt: new Date().toISOString(),
        pageId: selected.pageId,
        pageName: selected.pageName,
        instagramBusinessAccountId: selected.instagramBusinessAccountId,
        instagramUsername: selected.instagramUsername,
      },
    });

    if (selected.instagramBusinessAccountId) {
      await this.social.upsertConnectedAccount({
        organizationId: parsed.organizationId,
        clientId: parsed.clientId,
        platform: 'instagram',
        externalAccountId: selected.instagramBusinessAccountId,
        displayName: selected.instagramUsername
          ? `@${selected.instagramUsername}`
          : (selected.instagramName ?? selected.pageName),
        connectionId,
        channelExternalId: selected.instagramBusinessAccountId,
        channelName: selected.instagramUsername ?? selected.pageName,
      });
    }

    await this.social.upsertConnectedAccount({
      organizationId: parsed.organizationId,
      clientId: parsed.clientId,
      platform: 'facebook',
      externalAccountId: selected.pageId,
      displayName: selected.pageName,
      connectionId,
      channelExternalId: selected.pageId,
      channelName: selected.pageName,
    });

    await this.audit.record({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorType: 'user',
      action: 'social/meta.connect_complete',
      entityType: 'integrationConnection',
      entityId: connectionId,
      after: {
        pageId: selected.pageId,
        instagramBusinessAccountId: selected.instagramBusinessAccountId,
      },
    });

    return {
      organizationId: parsed.organizationId,
      clientId: parsed.clientId,
    };
  }

  webSuccessRedirect(): string {
    const webOrigin = this.config.get('WEB_APP_URL', { infer: true });
    return `${webOrigin}/integrations?meta=connected`;
  }

  webFailureRedirect(reason?: string): string {
    const webOrigin = this.config.get('WEB_APP_URL', { infer: true });
    const q = reason ? `&reason=${encodeURIComponent(reason.slice(0, 80))}` : '';
    return `${webOrigin}/integrations?meta=error${q}`;
  }

  /**
   * Disconnect a connected social account: stop publishing, cancel queued jobs,
   * and revoke/clear Meta credentials when no sibling accounts still use them.
   */
  async disconnectAccount(input: {
    organizationId: string;
    actorId: string;
    socialAccountId: string;
  }): Promise<{ id: string; platform: string }> {
    const account = await this.social.findAccountById(
      input.organizationId,
      input.socialAccountId,
    );
    if (!account) {
      throw notFound('Social account not found');
    }
    if (account.status !== 'CONNECTED') {
      return { id: account.id, platform: account.platform };
    }

    await this.social.cancelQueuedPublishJobsForAccount(
      input.organizationId,
      account.id,
    );
    await this.social.markAccountDisconnected(
      input.organizationId,
      account.id,
    );

    const connectionId = account.connectionId;
    if (connectionId) {
      const stillConnected = await this.social.countConnectedAccountsForConnection(
        input.organizationId,
        connectionId,
        account.id,
      );
      if (stillConnected === 0) {
        const credential = await this.integrations.findCredential(connectionId);
        if (credential?.accessToken) {
          await this.meta.revokeUserAuthorization(credential.accessToken);
        }
        await this.integrations.deleteCredential(connectionId);
        await this.integrations.update(input.organizationId, connectionId, {
          status: 'DISCONNECTED',
          metadata: { disconnectedAt: new Date().toISOString() },
        });
      }
    }

    await this.audit.record({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorType: 'user',
      action: 'social/meta.disconnect',
      entityType: 'socialAccount',
      entityId: account.id,
      before: {
        platform: account.platform,
        status: 'CONNECTED',
        connectionId: account.connectionId,
      },
      after: { status: 'DISCONNECTED' },
    });

    return { id: account.id, platform: account.platform };
  }
}

function parseState(state: string): OAuthState & { connectionId?: string } {
  try {
    const parsed = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as Partial<OAuthState & { connectionId?: string }>;
    if (
      !parsed.organizationId ||
      !parsed.clientId ||
      !parsed.actorId ||
      !parsed.platform
    ) {
      throw new Error('invalid');
    }
    return parsed as OAuthState & { connectionId?: string };
  } catch {
    throw unprocessable('Invalid OAuth state');
  }
}
