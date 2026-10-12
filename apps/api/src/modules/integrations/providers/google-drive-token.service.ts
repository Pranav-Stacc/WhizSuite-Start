import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsRepository } from '../infrastructure/repositories/integrations.repository';
import { GoogleDriveClient } from './google-drive.client';

@Injectable()
export class GoogleDriveTokenService {
  private readonly logger = new Logger(GoogleDriveTokenService.name);

  constructor(
    private readonly integrations: IntegrationsRepository,
    private readonly drive: GoogleDriveClient,
  ) {}

  async resolveAccessToken(
    organizationId: string,
    connectionId: string,
  ): Promise<string | null> {
    const connection = await this.integrations.findById(
      organizationId,
      connectionId,
    );
    if (!connection || connection.status !== 'CONNECTED') return null;

    const creds = await this.integrations.findCredential(connectionId);
    if (!creds) return null;

    if (creds.refreshToken) {
      try {
        const refreshed = await this.drive.refreshAccessToken(
          creds.refreshToken,
        );
        const encryptedData = JSON.stringify({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? creds.refreshToken,
        });
        await this.integrations.upsertCredential(
          organizationId,
          connectionId,
          encryptedData,
          refreshed.expiresAt ? new Date(refreshed.expiresAt) : null,
        );
        return refreshed.accessToken;
      } catch (error) {
        this.logger.warn(
          `Drive token refresh failed, using stored access token: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    return creds.accessToken;
  }
}
