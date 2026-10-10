import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../shared/config/app.config';
import type { GoogleCalendarEventPayload } from '@agency-os/contracts';

const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export type GoogleCalendarTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

@Injectable()
export class GoogleCalendarClient {
  private readonly logger = new Logger(GoogleCalendarClient.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.clientId() && this.clientSecret() && this.redirectUri(),
    );
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${OAUTH_AUTH}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleCalendarTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: this.redirectUri(),
      grant_type: 'authorization_code',
    });
    return this.requestTokens(body);
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<GoogleCalendarTokens> {
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      grant_type: 'refresh_token',
    });
    const tokens = await this.requestTokens(body);
    return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
  }

  async upsertEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId?: string | null;
    event: GoogleCalendarEventPayload;
  }): Promise<{ id: string }> {
    const body = this.toGoogleEvent(input.event);
    const calendarId = encodeURIComponent(input.calendarId);
    if (input.eventId) {
      const url = `${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(input.eventId)}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google Calendar update failed: ${text.slice(0, 200)}`);
      }
      const json = (await response.json()) as { id: string };
      return { id: json.id };
    }

    const url = `${CALENDAR_API}/calendars/${calendarId}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Calendar create failed: ${text.slice(0, 200)}`);
    }
    const json = (await response.json()) as { id: string };
    return { id: json.id };
  }

  async deleteEvent(input: {
    accessToken: string;
    calendarId: string;
    eventId: string;
  }): Promise<void> {
    const url = `${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${input.accessToken}` },
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(`Google Calendar delete failed: ${text.slice(0, 200)}`);
    }
  }

  async listEvents(input: {
    accessToken: string;
    calendarId: string;
    timeMin: string;
    timeMax: string;
  }): Promise<
    Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>
  > {
    const params = new URLSearchParams({
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    const url = `${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events?${params.toString()}`;
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${input.accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Calendar list failed: ${text.slice(0, 200)}`);
    }
    const json = (await response.json()) as {
      items?: Array<{
        id: string;
        summary?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };
    return json.items ?? [];
  }

  private toGoogleEvent(
    event: GoogleCalendarEventPayload,
  ): Record<string, unknown> {
    if (event.allDay) {
      const startDate = event.startsAt.slice(0, 10);
      const endDate = (event.endsAt ?? event.startsAt).slice(0, 10);
      return {
        summary: event.title,
        description: event.description,
        start: { date: startDate },
        end: { date: endDate },
      };
    }
    return {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startsAt },
      end: {
        dateTime:
          event.endsAt ??
          new Date(
            new Date(event.startsAt).getTime() + 60 * 60 * 1000,
          ).toISOString(),
      },
    };
  }

  private async requestTokens(
    body: URLSearchParams,
  ): Promise<GoogleCalendarTokens> {
    const response = await fetch(OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Calendar token exchange failed: ${text}`);
      throw new Error('Google Calendar authorization failed');
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

  private clientId(): string {
    return (
      this.config.get('GOOGLE_CALENDAR_CLIENT_ID', { infer: true }) ||
      this.config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true })
    );
  }

  private clientSecret(): string {
    return (
      this.config.get('GOOGLE_CALENDAR_CLIENT_SECRET', { infer: true }) ||
      this.config.get('GOOGLE_DRIVE_CLIENT_SECRET', { infer: true })
    );
  }

  private redirectUri(): string {
    return this.config.get('GOOGLE_CALENDAR_REDIRECT_URI', { infer: true });
  }
}
