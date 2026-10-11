/** Google Calendar integration contracts. */

export const GOOGLE_CALENDAR_PROVIDER_KEY = 'google_calendar' as const;

export const CalendarSyncDirections = ['OUT', 'IN', 'BOTH'] as const;
export type CalendarSyncDirection = (typeof CalendarSyncDirections)[number];

export type GoogleCalendarConnectionStatus =
  | 'AVAILABLE'
  | 'PENDING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'DISABLED';

export type GoogleCalendarSyncTypes = {
  meetings: boolean;
  shoots: boolean;
  tasks: boolean;
  posts: boolean;
};

export const DEFAULT_GOOGLE_CALENDAR_SYNC_TYPES: GoogleCalendarSyncTypes = {
  meetings: true,
  shoots: true,
  tasks: false,
  posts: false,
};

export type GoogleCalendarConnectionDto = {
  id: string;
  status: GoogleCalendarConnectionStatus;
  connectionId: string | null;
  externalCalendarId: string;
  syncDirection: CalendarSyncDirection;
  /** When true, newly created calendar items default to syncToGoogle. */
  defaultSyncNewEvents: boolean;
  syncTypes: GoogleCalendarSyncTypes;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  oauthConfigured: boolean;
};

export type GoogleCalendarEventPayload = {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay?: boolean;
  description?: string;
};
