import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  GOOGLE_CALENDAR_PROVIDER_KEY,
  type CalendarSyncDirection,
  type GoogleCalendarConnectionDto,
} from '@agency-os/contracts';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  problem,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { IntegrationsRepository } from '../../../integrations/infrastructure/repositories/integrations.repository';
import { GoogleCalendarClient } from '../../../integrations/providers/google-calendar.client';
import { CalendarConnectionRepository } from '../../infrastructure/repositories/calendar-connection.repository';
import { CalendarRepository } from '../../infrastructure/repositories/calendar.repository';
import { CalendarSyncQueue } from '../../jobs/calendar-sync.queue';

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);

  constructor(
    private readonly integrations: IntegrationsRepository,
    private readonly connections: CalendarConnectionRepository,
    private readonly calendar: CalendarRepository,
    private readonly google: GoogleCalendarClient,
    private readonly audit: AuditService,
    private readonly syncQueue: CalendarSyncQueue,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getConnection(
    organizationId: string,
  ): Promise<GoogleCalendarConnectionDto> {
    const oauthConfigured = this.google.isConfigured();
    const integration = await this.integrations.findByProviderKey(
      organizationId,
      GOOGLE_CALENDAR_PROVIDER_KEY,
    );
    const link = integration
      ? await this.connections.findByIntegrationConnection(
          organizationId,
          integration.id,
        )
      : null;

    return {
      id: link?.id ?? GOOGLE_CALENDAR_PROVIDER_KEY,
      status: !oauthConfigured
        ? 'DISABLED'
        : integration
          ? mapStatus(integration.status)
          : 'AVAILABLE',
      connectionId: integration?.id ?? null,
      externalCalendarId: link?.externalCalendarId ?? 'primary',
      syncDirection: (link?.syncDirection as CalendarSyncDirection) ?? 'OUT',
      defaultSyncNewEvents: link?.defaultSyncNewEvents ?? false,
      connectedAt: integration?.createdAt?.toISOString() ?? null,
      lastSyncedAt: link?.lastSyncedAt?.toISOString() ?? null,
      oauthConfigured,
    };
  }

  async beginConnect(
    organizationId: string,
    actorId: string,
  ): Promise<{ authorizeUrl: string }> {
    if (!this.google.isConfigured()) {
      throw problem(
        503,
        'Service Unavailable',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Google Calendar OAuth is not configured',
      );
    }
    const provider = await this.integrations.findProviderByKey(
      GOOGLE_CALENDAR_PROVIDER_KEY,
    );
    if (!provider) {
      throw unprocessable('Google Calendar provider is not seeded');
    }

    const existing = await this.integrations.findByProviderKey(
      organizationId,
      GOOGLE_CALENDAR_PROVIDER_KEY,
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
      JSON.stringify({ organizationId, connectionId, actorId, nonce }),
    ).toString('base64url');

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/google.connect_start',
      entityType: 'integrationConnection',
      entityId: connectionId,
    });

    return { authorizeUrl: this.google.buildAuthorizeUrl(state) };
  }

  async completeConnect(input: {
    code: string;
    state: string;
  }): Promise<{ organizationId: string; connectionId: string }> {
    const parsed = parseState(input.state);
    const tokens = await this.google.exchangeCode(input.code);
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
    await this.connections.upsert(parsed.organizationId, {
      integrationConnectionId: parsed.connectionId,
      externalCalendarId: 'primary',
      syncDirection: 'OUT',
      defaultSyncNewEvents: false,
    });
    await this.audit.record({
      organizationId: parsed.organizationId,
      actorId: parsed.actorId,
      actorType: 'user',
      action: 'calendar/google.connect_complete',
      entityType: 'integrationConnection',
      entityId: parsed.connectionId,
    });
    return {
      organizationId: parsed.organizationId,
      connectionId: parsed.connectionId,
    };
  }

  async disconnect(
    organizationId: string,
    actorId: string,
    connectionId: string,
  ): Promise<void> {
    await this.integrations.update(organizationId, connectionId, {
      status: 'DISCONNECTED',
      metadata: { disconnectedAt: new Date().toISOString() },
    });
    await this.connections.deleteByOrganization(organizationId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/google.disconnect',
      entityType: 'integrationConnection',
      entityId: connectionId,
    });
  }

  async updateSettings(
    organizationId: string,
    actorId: string,
    input: {
      externalCalendarId?: string;
      syncDirection?: CalendarSyncDirection;
      defaultSyncNewEvents?: boolean;
    },
  ) {
    const link = await this.connections.findByOrganization(organizationId);
    if (!link) {
      throw problem(
        404,
        'Not Found',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Google Calendar is not connected',
      );
    }
    await this.connections.updateSettings(organizationId, link.id, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'calendar/google.settings_update',
      entityType: 'calendarConnection',
      entityId: link.id,
      after: { ...input },
    });
    return this.getConnection(organizationId);
  }

  /** Enqueue outbound sync when the item is marked for Google. */
  async enqueueIfNeeded(
    organizationId: string,
    calendarItemId: string,
    syncToGoogle: boolean,
    actorId?: string,
  ): Promise<void> {
    if (!syncToGoogle) return;
    const connection = await this.getConnection(organizationId);
    if (connection.status !== 'CONNECTED') return;
    await this.syncQueue.enqueueOutbound({
      organizationId,
      calendarItemId,
      actorId,
    });
  }

  async pullFromGoogle(
    organizationId: string,
    actorId: string,
    range: { from: string; to: string },
  ): Promise<{ imported: number }> {
    const connection = await this.getConnection(organizationId);
    if (connection.status !== 'CONNECTED' || !connection.connectionId) {
      throw problem(
        404,
        'Not Found',
        ErrorCodes.INTEGRATION_NOT_CONNECTED,
        'Google Calendar is not connected',
      );
    }
    if (connection.syncDirection === 'OUT') {
      throw unprocessable('Inbound sync is disabled for this connection');
    }
    await this.syncQueue.enqueueInbound({
      organizationId,
      actorId,
      from: range.from,
      to: range.to,
    });
    return { imported: 0 };
  }

  async syncItemOutbound(
    organizationId: string,
    calendarItemId: string,
  ): Promise<void> {
    const item = await this.calendar.findById(organizationId, calendarItemId);
    if (!item || !item.syncToGoogle) return;
    if (!TenantContext.canAccessClient(item.clientId)) {
      this.logger.warn(
        `Skipping Google sync for ${calendarItemId}: client out of scope`,
      );
      return;
    }

    const access = await this.resolveAccessToken(organizationId);
    if (!access) return;

    const link = await this.connections.findByOrganization(organizationId);
    const calendarId = link?.externalCalendarId ?? 'primary';

    const result = await this.google.upsertEvent({
      accessToken: access.accessToken,
      calendarId,
      eventId: item.externalEventId,
      event: {
        title: item.title,
        startsAt: item.startsAt.toISOString(),
        endsAt: item.endsAt?.toISOString() ?? null,
        allDay: item.allDay,
        description: `Agency OS · ${item.sourceType}`,
      },
    });

    await this.calendar.update(organizationId, item.id, {
      externalEventId: result.id,
      externalCalendarId: calendarId,
      syncToGoogle: true,
    });

    if (link) {
      await this.connections.updateSettings(organizationId, link.id, {
        lastSyncedAt: new Date(),
      });
    }
  }

  async syncInboundRange(
    organizationId: string,
    range: { from: string; to: string },
  ): Promise<number> {
    const access = await this.resolveAccessToken(organizationId);
    if (!access) return 0;
    const link = await this.connections.findByOrganization(organizationId);
    if (!link) return 0;
    if (link.syncDirection === 'OUT') return 0;

    const events = await this.google.listEvents({
      accessToken: access.accessToken,
      calendarId: link.externalCalendarId,
      timeMin: range.from,
      timeMax: range.to,
    });

    let imported = 0;
    for (const event of events) {
      if (!event.id || !event.summary) continue;
      const existing = await this.calendar.findByExternalEventId(
        organizationId,
        event.id,
      );
      const startsAt = event.start?.dateTime ?? event.start?.date;
      if (!startsAt) continue;
      const endsAt = event.end?.dateTime ?? event.end?.date ?? null;
      const allDay = Boolean(event.start?.date);

      if (existing) {
        await this.calendar.update(organizationId, existing.id, {
          title: event.summary,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          allDay,
          syncToGoogle: true,
          externalEventId: event.id,
          externalCalendarId: link.externalCalendarId,
        });
      } else {
        const id = randomUUID();
        await this.calendar.create(organizationId, {
          id,
          sourceType: 'MEETING',
          sourceId: id,
          title: event.summary,
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : undefined,
          allDay,
          syncToGoogle: true,
          externalEventId: event.id,
          externalCalendarId: link.externalCalendarId,
          metadata: { importedFrom: 'google_calendar' },
        });
        imported += 1;
      }
    }

    await this.connections.updateSettings(organizationId, link.id, {
      lastSyncedAt: new Date(),
    });
    return imported;
  }

  private async resolveAccessToken(
    organizationId: string,
  ): Promise<{ accessToken: string } | null> {
    const integration = await this.integrations.findByProviderKey(
      organizationId,
      GOOGLE_CALENDAR_PROVIDER_KEY,
    );
    if (!integration || integration.status !== 'CONNECTED') return null;
    const creds = await this.integrations.findCredential(integration.id);
    if (!creds) return null;

    if (creds.refreshToken) {
      try {
        const refreshed = await this.google.refreshAccessToken(
          creds.refreshToken,
        );
        const encryptedData = JSON.stringify({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? creds.refreshToken,
        });
        await this.integrations.upsertCredential(
          organizationId,
          integration.id,
          encryptedData,
          refreshed.expiresAt ? new Date(refreshed.expiresAt) : null,
        );
        return { accessToken: refreshed.accessToken };
      } catch (error) {
        this.logger.warn(
          `Token refresh failed, using stored access token: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
    return { accessToken: creds.accessToken };
  }
}

function mapStatus(status: string): GoogleCalendarConnectionDto['status'] {
  if (status === 'CONNECTED') return 'CONNECTED';
  if (status === 'PENDING') return 'PENDING';
  if (status === 'ERROR') return 'ERROR';
  if (status === 'DISCONNECTED') return 'DISCONNECTED';
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
      throw new Error('invalid');
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
