export const InboxConversationTypes = ['COMMENT', 'DM', 'MENTION'] as const;
export type InboxConversationType = (typeof InboxConversationTypes)[number];

export const InboxConversationStatuses = ['OPEN', 'REPLIED', 'ARCHIVED'] as const;
export type InboxConversationStatus = (typeof InboxConversationStatuses)[number];

export const InboxPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type InboxPriority = (typeof InboxPriorities)[number];

export const InboxSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const;
export type InboxSentiment = (typeof InboxSentiments)[number];

export const InboxMessageDirections = ['INBOUND', 'OUTBOUND'] as const;
export type InboxMessageDirection = (typeof InboxMessageDirections)[number];

export const INBOX_HANDLE_MAX_LENGTH = 200;
export const INBOX_MESSAGE_MAX_LENGTH = 5000;

export interface InboxMessageDto {
  id: string;
  direction: InboxMessageDirection;
  body: string;
  authorId: string | null;
  createdAt: string;
}

export interface InboxConversationDto {
  id: string;
  clientId: string;
  type: InboxConversationType;
  status: InboxConversationStatus;
  priority: InboxPriority;
  sentiment: InboxSentiment | null;
  authorHandle: string | null;
  assigneeId: string | null;
  preview: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: InboxMessageDto[];
}
