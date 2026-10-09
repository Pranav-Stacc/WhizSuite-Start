import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import { env } from '@/shared/config/env';

type RawRecord = Record<string, unknown>;

export function orgPath(organizationId: string, segment: string): string {
  return `v1/organizations/${organizationId}/${segment.replace(/^\//, '')}`;
}

/** API list endpoints may return a bare array or a paginated envelope. */
export function unwrapList(payload: unknown): RawRecord[] {
  if (Array.isArray(payload)) return payload as RawRecord[];
  if (payload && typeof payload === 'object') {
    const record = payload as RawRecord;
    if (Array.isArray(record.data)) return record.data as RawRecord[];
    if (Array.isArray(record.items)) return record.items as RawRecord[];
  }
  return [];
}

function nextCursorOf(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const cursor = (payload as RawRecord).nextCursor;
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : null;
}

/** Fetches every page of a list endpoint, following `nextCursor` up to the configured page cap. */
export async function fetchAllPages(path: string, tags: string[]): Promise<RawRecord[]> {
  const rows: RawRecord[] = [];
  const separator = path.includes('?') ? '&' : '?';
  let url = path;
  for (let page = 0; page < env.API_LIST_MAX_PAGES; page += 1) {
    const payload = await apiFetch<unknown>(url, { tags });
    rows.push(...unwrapList(payload));
    const cursor = nextCursorOf(payload);
    if (!cursor) break;
    url = `${path}${separator}limit=${env.API_LIST_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`;
  }
  return rows;
}

export function str(raw: RawRecord, key: string, fallback = ''): string {
  const value = raw[key];
  return typeof value === 'string' ? value : fallback;
}

export function num(raw: RawRecord, key: string, fallback = 0): number {
  const value = raw[key];
  return typeof value === 'number' ? value : fallback;
}

export function iso(raw: RawRecord, key: string): string {
  const value = raw[key];
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

export function hueFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % 360;
}
