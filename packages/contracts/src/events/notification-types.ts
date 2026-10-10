/** In-app notification kinds; stored as `typeKey` and rendered by the web from its message catalog. */
export const NotificationTypeKeys = {
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATE_CHANGED: 'task.state_changed',
  TASK_COMMENTED: 'task.commented',
  TASK_DUE_SOON: 'task.due_soon',
  TASK_OVERDUE: 'task.overdue',
  CONTENT_APPROVED: 'content.approved',
  CONTENT_CHANGES_REQUESTED: 'content.changes_requested',
  APPROVAL_REQUESTED: 'approval.requested',
  CHAT_MESSAGE: 'chat.message',
  CHAT_MENTION: 'chat.mention',
  SOCIAL_POST_PUBLISHED: 'social_post.published',
  SOCIAL_POST_FAILED: 'social_post.failed',
} as const;

export type NotificationTypeKey =
  (typeof NotificationTypeKeys)[keyof typeof NotificationTypeKeys];

/** Structured context stored with a notification so the UI can link to the subject. */
export interface NotificationData {
  taskId?: string;
  contentId?: string;
  approvalRequestId?: string;
  roomId?: string;
  messageId?: string;
  title?: string;
  fromStatus?: string;
  toStatus?: string;
}
