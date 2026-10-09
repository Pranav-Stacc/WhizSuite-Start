import type { MessageKey } from '@/shared/i18n/t';
import type { NotificationKind } from './data/notifications.repository';

interface NotificationEventConfig {
  kind: NotificationKind;
  title: MessageKey;
  href: string;
}

/** Presentation for API notification `typeKey`s (versioned domain event types). */
export const NOTIFICATION_EVENTS: Record<string, NotificationEventConfig> = {
  'task.assigned.v1': { kind: 'task', title: 'notifications.event.taskAssigned', href: '/tasks' },
  'approval.requested.v1': { kind: 'approval', title: 'notifications.event.approvalRequested', href: '/approvals' },
  'content.scheduled.v1': { kind: 'approval', title: 'notifications.event.contentScheduled', href: '/calendar' },
  'social_post.published.v1': { kind: 'system', title: 'notifications.event.postPublished', href: '/content' },
  'social_post.failed.v1': { kind: 'system', title: 'notifications.event.postFailed', href: '/content' },
  'invitation.sent.v1': { kind: 'system', title: 'notifications.event.invitationSent', href: '/team' },
};

export const NOTIFICATIONS_HREF = '/notifications';
