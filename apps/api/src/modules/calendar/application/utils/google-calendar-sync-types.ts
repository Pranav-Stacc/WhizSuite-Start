import {
  DEFAULT_GOOGLE_CALENDAR_SYNC_TYPES,
  type GoogleCalendarSyncTypes,
} from '@agency-os/contracts';

export function parseSyncTypes(raw: unknown): GoogleCalendarSyncTypes {
  if (!raw || typeof raw !== 'object')
    return DEFAULT_GOOGLE_CALENDAR_SYNC_TYPES;
  const o = raw as Record<string, unknown>;
  return {
    meetings: o.meetings === true,
    shoots: o.shoots === true,
    tasks: o.tasks === true,
    posts: o.posts === true,
  };
}

/** Maps stored calendar item / feed source types to sync-type toggles. */
export function sourceTypeSyncKey(
  sourceType: string,
): keyof GoogleCalendarSyncTypes | null {
  const t = sourceType.toUpperCase();
  if (t === 'SHOOT') return 'shoots';
  if (t === 'TASK') return 'tasks';
  if (t === 'CONTENT') return 'posts';
  if (t === 'MEETING' || t === 'MANUAL' || t === 'DEADLINE') return 'meetings';
  return null;
}

export function isSourceTypeSyncEnabled(
  sourceType: string,
  syncTypes: GoogleCalendarSyncTypes,
): boolean {
  const key = sourceTypeSyncKey(sourceType);
  if (!key) return false;
  return syncTypes[key];
}
