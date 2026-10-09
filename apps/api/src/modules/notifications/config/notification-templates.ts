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
  [NotificationTypeKeys.APPROVAL_REQUESTED]: {
    subject: 'Approval requested',
    body: 'Your approval is needed on "{title}".',
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
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function renderTemplate(template: string, values: object): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value: unknown = (values as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  });
}
