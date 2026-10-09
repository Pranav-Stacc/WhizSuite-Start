import { NotificationTypeKeys, type NotificationData } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';
import type { NotificationKind } from './data/notifications.repository';

interface NotificationEventConfig {
  kind: NotificationKind;
  title: MessageKey;
  href: (data: NotificationData) => string;
}

const TASKS_HREF = '/tasks';
const APPROVALS_HREF = '/approvals';
const contentHref = (data: NotificationData) => (data.contentId ? `/content/${data.contentId}` : '/content');
const approvalHref = (data: NotificationData) =>
  data.approvalRequestId ? `${APPROVALS_HREF}?id=${data.approvalRequestId}` : APPROVALS_HREF;

/** Presentation for API notification `typeKey`s. */
export const NOTIFICATION_EVENTS: Record<string, NotificationEventConfig> = {
  [NotificationTypeKeys.TASK_ASSIGNED]: { kind: 'task', title: 'notifications.event.taskAssigned', href: () => TASKS_HREF },
  [NotificationTypeKeys.CONTENT_APPROVED]: { kind: 'approval', title: 'notifications.event.contentApproved', href: contentHref },
  [NotificationTypeKeys.CONTENT_CHANGES_REQUESTED]: { kind: 'approval', title: 'notifications.event.changesRequested', href: contentHref },
  [NotificationTypeKeys.APPROVAL_REQUESTED]: { kind: 'approval', title: 'notifications.event.approvalRequested', href: approvalHref },
};

export const NOTIFICATIONS_HREF = '/notifications';
