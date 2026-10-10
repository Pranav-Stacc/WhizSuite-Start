/** In-app notification kinds; stored as `typeKey` and rendered by the web from its message catalog. */
export const NotificationTypeKeys = {
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATE_CHANGED: 'task.state_changed',
  TASK_COMMENTED: 'task.commented',
  TASK_DUE_SOON: 'task.due_soon',
  TASK_OVERDUE: 'task.overdue',
  CONTENT_APPROVED: 'content.approved',
  CONTENT_CHANGES_REQUESTED: 'content.changes_requested',
  CONTENT_REJECTED: 'content.rejected',
  CONTENT_SCHEDULED: 'content.scheduled',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_COMPLETED: 'approval.completed',
  APPROVAL_REJECTED: 'approval.rejected',
  APPROVAL_CHANGES_REQUESTED: 'approval.changes_requested',
  APPROVAL_REMINDER: 'approval.reminder',
  CHAT_MESSAGE: 'chat.message',
  CHAT_MENTION: 'chat.mention',
  SOCIAL_POST_PUBLISHED: 'social_post.published',
  SOCIAL_POST_FAILED: 'social_post.failed',
  SOCIAL_ACCOUNT_DISCONNECTED: 'social_account.disconnected',
  INVITATION_ACCEPTED: 'invitation.accepted',
  AUTOMATION_NOTIFY: 'automation.notify',
  FEEDBACK_COMMENT: 'feedback.comment',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_PAID: 'invoice.paid',
  CALENDAR_REMINDER: 'calendar.reminder',
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
  invoiceId?: string;
  socialAccountId?: string;
  invitationId?: string;
  feedbackThreadId?: string;
  title?: string;
  fromStatus?: string;
  toStatus?: string;
  reminderKey?: string;
  calendarItemId?: string;
  startsAt?: string;
}
