import {
  NotificationChannels,
  type NotificationChannelSettings,
} from '@agency-os/contracts';

/** Stored per-type settings win; channels the user never touched fall back to the configured defaults. */
export function resolveChannels(
  stored: unknown,
  defaults: readonly string[],
): NotificationChannelSettings {
  const settings = Object.fromEntries(
    NotificationChannels.map((channel) => [
      channel,
      defaults.includes(channel),
    ]),
  ) as NotificationChannelSettings;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored))
    return settings;
  const record = stored as Record<string, unknown>;
  for (const channel of NotificationChannels) {
    const value = record[channel];
    if (typeof value === 'boolean') settings[channel] = value;
  }
  return settings;
}
