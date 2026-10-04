const MS_PER_DAY = 86_400_000;

export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

const MINOR_UNITS_PER_MAJOR = 100;

/** Converts a major-unit amount typed in a form (rupees) to integer minor units. */
export function toMinorUnits(major: number): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

export function fromMinorUnits(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

/** Money is stored in minor units (paise/cents) and formatted here only. */
export function formatMoney(minor: number, currency = DEFAULT_CURRENCY, compact = false): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? 'compact' : 'standard',
  }).format(fromMinorUnits(minor));
}

export function formatNumber(value: number, compact = false): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function formatDate(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, opts ?? { day: 'numeric', month: 'short' }).format(date);
}

export function formatDateTime(iso: string | Date): string {
  return formatDate(iso, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(0, 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < MS_PER_DAY) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 30 * MS_PER_DAY) return rtf.format(Math.round(diff / MS_PER_DAY), 'day');
  return formatDate(iso);
}

export type DueTone = 'danger' | 'warning' | 'neutral' | 'success';

export function dueInfo(iso: string | undefined, done = false, now: number = Date.now()): { label: string; tone: DueTone } {
  if (!iso) return { label: '—', tone: 'neutral' };
  if (done) return { label: formatDate(iso), tone: 'success' };
  const days = Math.ceil((new Date(iso).getTime() - now) / MS_PER_DAY);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'danger' };
  if (days === 0) return { label: 'Today', tone: 'warning' };
  if (days === 1) return { label: 'Tomorrow', tone: 'warning' };
  if (days <= 7) return { label: `In ${days}d`, tone: 'neutral' };
  return { label: formatDate(iso), tone: 'neutral' };
}

export function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const MS_PER_HOUR = 3_600_000;

/** ISO timestamp for `hours` hours in the past — used for "happened recently" seed data. */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * MS_PER_HOUR).toISOString();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_HUES = [152, 190, 210, 262, 320, 24, 48, 100];

export function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[hash % AVATAR_HUES.length] ?? 152;
}

export function toDateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

/** Converts a yyyy-mm-dd form value into an ISO timestamp at the given local hour (default 17:00). */
export function dateKeyToIso(dateKey: string, hour = 17): string {
  return new Date(`${dateKey}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
}

/** ISO timestamp -> value accepted by <input type="datetime-local"> (local time, minute precision). */
export function toDateTimeLocal(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${toDateKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** datetime-local form value -> ISO timestamp. */
export function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

const KB_PER_MB = 1024;

/** Human-friendly file size from kilobytes. Zero means "unknown". */
export function formatFileSize(kb: number): string {
  if (kb <= 0) return '—';
  return kb >= KB_PER_MB ? `${(kb / KB_PER_MB).toFixed(1)} MB` : `${kb} KB`;
}
