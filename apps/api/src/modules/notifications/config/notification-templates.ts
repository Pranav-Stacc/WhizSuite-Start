import {
  NotificationTypeKeys,
  type NotificationTypeKey,
} from '@agency-os/contracts';

/** Server-rendered copy for out-of-app channels (email, push); in-app UIs render from their own catalogs. */
export interface NotificationTemplate {
  subject: string;
  body: string;
  actionLabel: string;
}

export const NOTIFICATION_TEMPLATES: Readonly<
  Record<NotificationTypeKey, NotificationTemplate>
> = {
  [NotificationTypeKeys.TASK_ASSIGNED]: {
    subject: 'New task assigned',
    body: 'You were assigned "{title}".',
    actionLabel: 'Open task',
  },
  [NotificationTypeKeys.TASK_STATE_CHANGED]: {
    subject: 'Task status updated',
    body: '"{title}" moved to {toStatus}.',
    actionLabel: 'Open task',
  },
  [NotificationTypeKeys.TASK_COMMENTED]: {
    subject: 'New comment on task',
    body: 'Someone commented on "{title}".',
    actionLabel: 'Open task',
  },
  [NotificationTypeKeys.TASK_DUE_SOON]: {
    subject: 'Task due soon',
    body: '"{title}" is due soon.',
    actionLabel: 'Open task',
  },
  [NotificationTypeKeys.TASK_OVERDUE]: {
    subject: 'Task overdue',
    body: '"{title}" is overdue.',
    actionLabel: 'Open task',
  },
  [NotificationTypeKeys.CONTENT_APPROVED]: {
    subject: 'Content approved',
    body: '"{title}" was approved.',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.CONTENT_CHANGES_REQUESTED]: {
    subject: 'Changes requested',
    body: 'Changes were requested on "{title}".',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.CONTENT_REJECTED]: {
    subject: 'Content rejected',
    body: '"{title}" was rejected.',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.CONTENT_SCHEDULED]: {
    subject: 'Content scheduled',
    body: '"{title}" is scheduled to publish.',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.APPROVAL_REQUESTED]: {
    subject: 'Approval requested',
    body: 'Your approval is needed on "{title}".',
    actionLabel: 'Review',
  },
  [NotificationTypeKeys.APPROVAL_COMPLETED]: {
    subject: 'Approval completed',
    body: '"{title}" was approved.',
    actionLabel: 'View approval',
  },
  [NotificationTypeKeys.APPROVAL_REJECTED]: {
    subject: 'Approval rejected',
    body: '"{title}" was rejected.',
    actionLabel: 'View approval',
  },
  [NotificationTypeKeys.APPROVAL_CHANGES_REQUESTED]: {
    subject: 'Changes requested on approval',
    body: 'Changes were requested on "{title}".',
    actionLabel: 'View approval',
  },
  [NotificationTypeKeys.APPROVAL_REMINDER]: {
    subject: 'Approval reminder',
    body: 'Reminder: your approval is still needed on "{title}".',
    actionLabel: 'Review',
  },
  [NotificationTypeKeys.CHAT_MESSAGE]: {
    subject: 'New chat message',
    body: '{title}',
    actionLabel: 'Open chat',
  },
  [NotificationTypeKeys.CHAT_MENTION]: {
    subject: 'You were mentioned in chat',
    body: '{title}',
    actionLabel: 'Open chat',
  },
  [NotificationTypeKeys.SOCIAL_POST_PUBLISHED]: {
    subject: 'Post published',
    body: '"{title}" was published to Instagram.',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.SOCIAL_POST_FAILED]: {
    subject: 'Publish failed',
    body: '"{title}" failed to publish to Instagram. Open the post and try Publish now again.',
    actionLabel: 'View content',
  },
  [NotificationTypeKeys.SOCIAL_ACCOUNT_DISCONNECTED]: {
    subject: 'Social account disconnected',
    body: '"{title}" was disconnected. Reconnect it under Integrations to resume publishing.',
    actionLabel: 'Open integrations',
  },
  [NotificationTypeKeys.INVITATION_ACCEPTED]: {
    subject: 'Invitation accepted',
    body: '{title} accepted your invitation.',
    actionLabel: 'View members',
  },
  [NotificationTypeKeys.AUTOMATION_NOTIFY]: {
    subject: 'Automation notification',
    body: '{title}',
    actionLabel: 'Open app',
  },
  [NotificationTypeKeys.FEEDBACK_COMMENT]: {
    subject: 'New feedback',
    body: 'New feedback on "{title}".',
    actionLabel: 'View feedback',
  },
  [NotificationTypeKeys.INVOICE_OVERDUE]: {
    subject: 'Invoice overdue',
    body: 'Invoice "{title}" is overdue.',
    actionLabel: 'View invoice',
  },
  [NotificationTypeKeys.INVOICE_PAID]: {
    subject: 'Invoice paid',
    body: 'Invoice "{title}" was marked paid.',
    actionLabel: 'View invoice',
  },
  [NotificationTypeKeys.CALENDAR_REMINDER]: {
    subject: 'Calendar reminder',
    body: 'Reminder: "{title}" is starting soon.',
    actionLabel: 'Open calendar',
  },
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function renderTemplate(template: string, values: object): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value: unknown = (values as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  });
}
