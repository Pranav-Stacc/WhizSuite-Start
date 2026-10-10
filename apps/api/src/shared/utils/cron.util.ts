import { CronExpressionParser } from 'cron-parser';

/** Next fire time for a cron expression; falls back to +1 hour on parse errors. */
export function nextCronRun(
  cron: string,
  timezone: string,
  from: Date = new Date(),
): Date {
  try {
    return CronExpressionParser.parse(cron, {
      currentDate: from,
      tz: timezone || 'UTC',
    })
      .next()
      .toDate();
  } catch {
    return new Date(from.getTime() + 60 * 60 * 1000);
  }
}
