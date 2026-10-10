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

function pick(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function notificationData(raw: unknown): NotificationData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  return {
    taskId: pick(row.taskId),
    contentId: pick(row.contentId),
    approvalRequestId: pick(row.approvalRequestId),
    roomId: pick(row.roomId),
    messageId: pick(row.messageId),
    invoiceId: pick(row.invoiceId),
    socialAccountId: pick(row.socialAccountId),
    invitationId: pick(row.invitationId),
    feedbackThreadId: pick(row.feedbackThreadId),
    title: pick(row.title),
    fromStatus: pick(row.fromStatus),
    toStatus: pick(row.toStatus),
    reminderKey: pick(row.reminderKey),
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
