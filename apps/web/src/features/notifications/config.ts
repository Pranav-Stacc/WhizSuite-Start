import { NotificationTypeKeys, type NotificationData } from '@agency-os/contracts';
import type { MessageKey } from '@/shared/i18n/t';
import type { NotificationKind } from './data/notifications.repository';

interface NotificationEventConfig {
  kind: NotificationKind;
  title: MessageKey;
  href: (data: NotificationData) => string;
}

const taskHref = (data: NotificationData) => (data.taskId ? `/tasks?task=${data.taskId}` : '/tasks');
const APPROVALS_HREF = '/approvals';
const contentHref = (data: NotificationData) => (data.contentId ? `/content/${data.contentId}` : '/content');
const approvalHref = (data: NotificationData) =>
  data.approvalRequestId ? `${APPROVALS_HREF}?id=${data.approvalRequestId}` : APPROVALS_HREF;
const invoiceHref = (data: NotificationData) =>
  data.invoiceId ? `/invoices/${data.invoiceId}` : '/invoices';

/** Presentation for API notification `typeKey`s. */
export const NOTIFICATION_EVENTS: Record<string, NotificationEventConfig> = {
  [NotificationTypeKeys.TASK_ASSIGNED]: { kind: 'task', title: 'notifications.event.taskAssigned', href: taskHref },
  [NotificationTypeKeys.TASK_STATE_CHANGED]: { kind: 'task', title: 'notifications.event.taskStateChanged', href: taskHref },
  [NotificationTypeKeys.TASK_COMMENTED]: { kind: 'task', title: 'notifications.event.taskCommented', href: taskHref },
  [NotificationTypeKeys.TASK_DUE_SOON]: { kind: 'task', title: 'notifications.event.taskDueSoon', href: taskHref },
  [NotificationTypeKeys.TASK_OVERDUE]: { kind: 'task', title: 'notifications.event.taskOverdue', href: taskHref },
  [NotificationTypeKeys.CONTENT_APPROVED]: { kind: 'approval', title: 'notifications.event.contentApproved', href: contentHref },
  [NotificationTypeKeys.CONTENT_CHANGES_REQUESTED]: { kind: 'approval', title: 'notifications.event.changesRequested', href: contentHref },
  [NotificationTypeKeys.CONTENT_REJECTED]: { kind: 'approval', title: 'notifications.event.contentRejected', href: contentHref },
  [NotificationTypeKeys.CONTENT_SCHEDULED]: { kind: 'system', title: 'notifications.event.contentScheduled', href: contentHref },
  [NotificationTypeKeys.APPROVAL_REQUESTED]: { kind: 'approval', title: 'notifications.event.approvalRequested', href: approvalHref },
  [NotificationTypeKeys.APPROVAL_COMPLETED]: { kind: 'approval', title: 'notifications.event.approvalCompleted', href: approvalHref },
  [NotificationTypeKeys.APPROVAL_REJECTED]: { kind: 'approval', title: 'notifications.event.approvalRejected', href: approvalHref },
  [NotificationTypeKeys.APPROVAL_CHANGES_REQUESTED]: { kind: 'approval', title: 'notifications.event.approvalChangesRequested', href: approvalHref },
  [NotificationTypeKeys.APPROVAL_REMINDER]: { kind: 'approval', title: 'notifications.event.approvalReminder', href: approvalHref },
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
  [NotificationTypeKeys.SOCIAL_POST_PUBLISHED]: {
    kind: 'system',
    title: 'notifications.event.socialPostPublished',
    href: contentHref,
  },
  [NotificationTypeKeys.SOCIAL_POST_FAILED]: {
    kind: 'system',
    title: 'notifications.event.socialPostFailed',
    href: contentHref,
  },
  [NotificationTypeKeys.SOCIAL_ACCOUNT_DISCONNECTED]: {
    kind: 'system',
    title: 'notifications.event.socialAccountDisconnected',
    href: () => '/integrations',
  },
  [NotificationTypeKeys.INVITATION_ACCEPTED]: {
    kind: 'system',
    title: 'notifications.event.invitationAccepted',
    href: () => '/team',
  },
  [NotificationTypeKeys.AUTOMATION_NOTIFY]: {
    kind: 'system',
    title: 'notifications.event.automationNotify',
    href: () => '/automations',
  },
  [NotificationTypeKeys.FEEDBACK_COMMENT]: {
    kind: 'approval',
    title: 'notifications.event.feedbackComment',
    href: contentHref,
  },
  [NotificationTypeKeys.INVOICE_OVERDUE]: {
    kind: 'invoice',
    title: 'notifications.event.invoiceOverdue',
    href: invoiceHref,
  },
  [NotificationTypeKeys.INVOICE_PAID]: {
    kind: 'invoice',
    title: 'notifications.event.invoicePaid',
    href: invoiceHref,
  },
  [NotificationTypeKeys.CALENDAR_REMINDER]: {
    kind: 'system',
    title: 'notifications.event.calendarReminder',
    href: (data) =>
      data.calendarItemId ? `/calendar?item=${data.calendarItemId}` : '/calendar',
  },
  [NotificationTypeKeys.CALENDAR_ITEM_CREATED]: {
    kind: 'system',
    title: 'notifications.event.calendarItemCreated',
    href: (data) =>
      data.calendarItemId ? `/calendar?item=${data.calendarItemId}` : '/calendar',
  },
};

export const NOTIFICATIONS_HREF = '/notifications';
