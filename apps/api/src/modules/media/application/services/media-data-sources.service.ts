import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  GOOGLE_DRIVE_PROVIDER_KEY,
  type MediaDataSourceDto,
} from '@agency-os/contracts';
import { createHash, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  problem,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { IntegrationsRepository } from '../../../integrations/infrastructure/repositories/integrations.repository';
import { GoogleDriveClient } from '../../../integrations/providers/google-drive.client';

@Injectable()
export class MediaDataSourcesService {
  constructor(
    private readonly integrations: IntegrationsRepository,
    private readonly drive: GoogleDriveClient,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string): Promise<MediaDataSourceDto[]> {
    const drive = await this.integrations.findByProviderKey(
      organizationId,
      GOOGLE_DRIVE_PROVIDER_KEY,
    );
    const driveConfigured = this.drive.isConfigured();

    return [
      {
        id: 'platform',
        kind: 'platform',
        name: 'Platform storage',
        status: 'AVAILABLE',
        connectionId: null,
        connectedAt: null,
        metadata: { systemOfRecord: true },
      },
      {
        id: drive?.id ?? GOOGLE_DRIVE_PROVIDER_KEY,
        kind: 'google_drive',
        name: 'Google Drive',
        status: drive
          ? mapStatus(drive.status)
          : driveConfigured
            ? 'AVAILABLE'
            : 'DISABLED',
        connectionId: drive?.id ?? null,
        connectedAt: drive?.createdAt?.toISOString() ?? null,
        metadata: {
          oauthConfigured: driveConfigured,
          providerKey: GOOGLE_DRIVE_PROVIDER_KEY,
        },
      },
    ];
  }

  async beginGoogleDriveConnect(
    organizationId: string,
    actorId: string,
  ): Promise<{ authorizeUrl: string }> {
    if (!this.drive.isConfigured()) {
      throw problem(
        503,
        'Service Unavailable',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Google Drive OAuth is not configured',
      );
    }
    const provider = await this.integrations.findProviderByKey(
      GOOGLE_DRIVE_PROVIDER_KEY,
    );
    if (!provider) {
      throw unprocessable('Google Drive provider is not seeded');
    }

    const existing = await this.integrations.findByProviderKey(
      organizationId,
      GOOGLE_DRIVE_PROVIDER_KEY,
    );
    let connectionId = existing?.id;
    if (!connectionId) {
      const created = await this.integrations.create(organizationId, {
        providerId: provider.id,
        status: 'PENDING',
        metadata: {},
      });
      connectionId = created.id;
    } else if (existing?.status === 'CONNECTED') {
      await this.integrations.update(organizationId, connectionId, {
        status: 'PENDING',
      });
    }

    const nonce = randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        connectionId,
        actorId,
        nonce,
      }),
    ).toString('base64url');

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/data-sources.google_drive.connect_start',
      entityType: 'integrationConnection',
      entityId: connectionId,
    });

    return { authorizeUrl: this.drive.buildAuthorizeUrl(state) };
  }

  async completeGoogleDriveConnect(input: {
    code: string;
    state: string;
  }): Promise<{ organizationId: string; connectionId: string }> {
    const parsed = parseState(input.state);
    const tokens = await this.drive.exchangeCode(input.code);
    const encryptedData = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      fingerprint: createHash('sha256')
        .update(tokens.accessToken)
        .digest('hex')
        .slice(0, 12),
    });
    await this.integrations.upsertCredential(
      parsed.organizationId,
      parsed.connectionId,
      encryptedData,
      tokens.expiresAt ? new Date(tokens.expiresAt) : null,
    );
    await this.integrations.update(parsed.organizationId, parsed.connectionId, {
      status: 'CONNECTED',
      metadata: { connectedAt: new Date().toISOString() },
    });
    await this.audit.record({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorType: 'user',
      action: 'media/data-sources.google_drive.connect_complete',
      entityType: 'integrationConnection',
      entityId: parsed.connectionId,
    });
    return {
      organizationId: parsed.organizationId,
      connectionId: parsed.connectionId,
    };
  }

  async disconnectGoogleDrive(
    organizationId: string,
    actorId: string,
    connectionId: string,
  ): Promise<void> {
    await this.integrations.update(organizationId, connectionId, {
      status: 'DISCONNECTED',
      metadata: { disconnectedAt: new Date().toISOString() },
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'media/data-sources.google_drive.disconnect',
      entityType: 'integrationConnection',
      entityId: connectionId,
    });
  }
}

function mapStatus(status: string): MediaDataSourceDto['status'] {
  if (status === 'CONNECTED') return 'CONNECTED';
  if (status === 'PENDING') return 'PENDING';
  if (status === 'ERROR') return 'ERROR';
  return 'AVAILABLE';
}

function parseState(state: string): {
  organizationId: string;
  connectionId: string;
  actorId: string;
} {
  try {
    const raw = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as {
      organizationId?: string;
      connectionId?: string;
      actorId?: string;
    };
    if (!raw.organizationId || !raw.connectionId || !raw.actorId) {
      throw new Error('incomplete');
    }
    return {
      organizationId: raw.organizationId,
      connectionId: raw.connectionId,
      actorId: raw.actorId,
    };
  } catch {
    throw unprocessable('Invalid OAuth state');
  }
}
