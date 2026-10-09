/** In-app notification kinds; stored as `typeKey` and rendered by the web from its message catalog. */
export const NotificationTypeKeys = {
  TASK_ASSIGNED: 'task.assigned',
  CONTENT_APPROVED: 'content.approved',
  CONTENT_CHANGES_REQUESTED: 'content.changes_requested',
  APPROVAL_REQUESTED: 'approval.requested',
} as const;

export type NotificationTypeKey =
  (typeof NotificationTypeKeys)[keyof typeof NotificationTypeKeys];

/** Structured context stored with a notification so the UI can link to the subject. */
export interface NotificationData {
  taskId?: string;
  contentId?: string;
  approvalRequestId?: string;
  title?: string;
}
