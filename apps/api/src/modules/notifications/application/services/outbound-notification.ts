import type {
  NotificationData,
  NotificationTypeKey,
} from '@agency-os/contracts';
import {
  NOTIFICATION_TEMPLATES,
  renderTemplate,
} from '../../config/notification-templates';
import type { OutboundNotification } from '../ports/notification-channel.port';

export interface StoredNotification {
  id: string;
  organizationId: string;
  recipientId: string;
  typeKey: string;
  title: string;
  body: string;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

function notificationData(raw: unknown): NotificationData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const { taskId, contentId, title } = raw as Record<string, unknown>;
  const pick = (value: unknown) =>
    typeof value === 'string' ? value : undefined;
  return {
    taskId: pick(taskId),
    contentId: pick(contentId),
    title: pick(title),
  };
}

export function toOutboundNotification(
  stored: StoredNotification,
): OutboundNotification {
  const typeKey = stored.typeKey as NotificationTypeKey;
  const data = notificationData(stored.data);
  const template = NOTIFICATION_TEMPLATES[typeKey] as
    (typeof NOTIFICATION_TEMPLATES)[NotificationTypeKey] | undefined;
  return {
    id: stored.id,
    organizationId: stored.organizationId,
    recipientId: stored.recipientId,
    typeKey,
    subject: template ? renderTemplate(template.subject, data) : stored.title,
    body: template ? renderTemplate(template.body, data) : stored.body,
    actionLabel: template?.actionLabel ?? '',
    data,
    readAt: stored.readAt,
    createdAt: stored.createdAt,
  };
}
