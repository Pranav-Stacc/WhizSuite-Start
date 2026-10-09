const MONTH_PARAM = /^(\d{4})-(\d{2})$/;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_WEEK = 7;
/** Any Monday; used only to render localised weekday names in Monday-first order. */
const REFERENCE_MONDAY = new Date(2024, 0, 1);

export interface MonthRef {
  year: number;
  month: number;
}

/** `YYYY-MM` query value for a month (month is 0-based). */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Parses a `YYYY-MM` query value, falling back to the current month. */
export function parseMonth(value: string | undefined): MonthRef {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const month = Number(match[2]) - 1;
    if (month >= 0 && month < MONTHS_IN_YEAR) return { year: Number(match[1]), month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function daysInMonth({ year, month }: MonthRef): Date[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

export function weekdayLabels(): string[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    new Date(REFERENCE_MONDAY.getFullYear(), REFERENCE_MONDAY.getMonth(), REFERENCE_MONDAY.getDate() + i).toLocaleDateString(undefined, { weekday: 'short' }),
  );
}

export function monthTitle({ year, month }: MonthRef): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
