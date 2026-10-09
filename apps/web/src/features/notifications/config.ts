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
  [NotificationTypeKeys.TASK_STATE_CHANGED]: { kind: 'task', title: 'notifications.event.taskStateChanged', href: () => TASKS_HREF },
  [NotificationTypeKeys.TASK_COMMENTED]: { kind: 'task', title: 'notifications.event.taskCommented', href: () => TASKS_HREF },
  [NotificationTypeKeys.TASK_DUE_SOON]: { kind: 'task', title: 'notifications.event.taskDueSoon', href: () => TASKS_HREF },
  [NotificationTypeKeys.TASK_OVERDUE]: { kind: 'task', title: 'notifications.event.taskOverdue', href: () => TASKS_HREF },
  [NotificationTypeKeys.CONTENT_APPROVED]: { kind: 'approval', title: 'notifications.event.contentApproved', href: contentHref },
  [NotificationTypeKeys.CONTENT_CHANGES_REQUESTED]: { kind: 'approval', title: 'notifications.event.changesRequested', href: contentHref },
  [NotificationTypeKeys.APPROVAL_REQUESTED]: { kind: 'approval', title: 'notifications.event.approvalRequested', href: approvalHref },
  [NotificationTypeKeys.CHAT_MESSAGE]: {
    kind: 'system',
    title: 'notifications.event.chatMessage',
    href: (data) => (data.roomId ? `/chat?room=${data.roomId}` : '/chat'),
  },
  [NotificationTypeKeys.CHAT_MENTION]: {
    kind: 'mention',
    title: 'notifications.event.chatMention',
    href: (data) => (data.roomId ? `/chat?room=${data.roomId}` : '/chat'),
  },
};

export const NOTIFICATIONS_HREF = '/notifications';
