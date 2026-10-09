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
};

const PLACEHOLDER = /\{(\w+)\}/g;

export function renderTemplate(template: string, values: object): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value: unknown = (values as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  });
}
