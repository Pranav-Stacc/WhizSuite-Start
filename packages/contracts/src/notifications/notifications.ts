import type { NotificationData, NotificationTypeKey } from '../events/notification-types.js';

/** Delivery channels a user can toggle per notification type. */
export const NotificationChannels = ['inApp', 'email', 'push'] as const;
export type NotificationChannel = (typeof NotificationChannels)[number];
export type NotificationChannelSettings = Record<NotificationChannel, boolean>;

/** `enabled` mirrors `channels.inApp` for clients that only expose a single toggle. */
export interface NotificationPreferenceDto {
  typeKey: NotificationTypeKey;
  enabled: boolean;
  channels: NotificationChannelSettings;
}

export interface NotificationPreferenceUpdateInput {
  enabled?: boolean;
  channels?: Partial<NotificationChannelSettings>;
}

export interface NotificationDto {
  id: string;
  typeKey: NotificationTypeKey;
  title: string;
  body: string;
  data: (NotificationData & { eventId?: string }) | null;
  readAt: string | null;
  createdAt: string;
}

export const DevicePlatforms = ['ANDROID', 'IOS', 'WEB'] as const;
export type DevicePlatform = (typeof DevicePlatforms)[number];
export const DEVICE_TOKEN_MAX_LENGTH = 4096;
export const DEVICE_META_MAX_LENGTH = 50;

export interface RegisterDeviceInput {
  token: string;
  platform: DevicePlatform;
  appVersion?: string;
  locale?: string;
}

export interface DeviceDto {
  id: string;
  platform: DevicePlatform;
  appVersion: string | null;
  lastSeenAt: string;
}

/** Socket.IO namespace and server→client events; clients authenticate with `auth.token` (access JWT). */
export const REALTIME_NAMESPACE = '/realtime';
export const RealtimeEvents = {
  CONNECTED: 'connected',
  PONG: 'pong',
  NOTIFICATION_CREATED: 'notification.created',
} as const;
export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
