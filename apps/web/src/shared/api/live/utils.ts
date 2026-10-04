import 'server-only';

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
