/** Injected into agent system prompts so reminders respect org local time and "today". */
export function buildAgentRuntimeContext(timezone: string, now = new Date()): string {
  const tz = timezone.trim() || 'UTC';
  let localNow = now.toISOString();
  try {
    localNow = now.toLocaleString('en-US', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'long',
    });
  } catch {
    // Invalid IANA name — still provide UTC anchor.
  }
  return [
    'Runtime context (authoritative for scheduling):',
    `- Organization timezone: ${tz}`,
    `- Current local date/time in that timezone: ${localNow}`,
    `- Current instant (UTC): ${now.toISOString()}`,
    'When the user says "today", "tomorrow", or a local time without a zone, interpret it in the organization timezone, then convert startsAt/endsAt to ISO-8601 UTC for calendar.create.',
  ].join('\n');
}
