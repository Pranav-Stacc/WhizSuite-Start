/** Production chat domain contracts — rooms, messages, mentions, attachments. */

export const ChatRoomTypes = ['DM', 'GROUP', 'CLIENT'] as const;
export type ChatRoomType = (typeof ChatRoomTypes)[number];

export const ChatMemberRoles = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] as const;
export type ChatMemberRole = (typeof ChatMemberRoles)[number];

export const ChatMessageTypes = ['TEXT', 'SYSTEM', 'MEDIA'] as const;
export type ChatMessageType = (typeof ChatMessageTypes)[number];

/** Cross-feature entity mentions inside a message body. */
export const ChatMentionTypes = [
  'USER',
  'CLIENT',
  'TASK',
  'PROJECT',
  'CONTENT',
  'CALENDAR_EVENT',
  'LEAD',
] as const;
export type ChatMentionType = (typeof ChatMentionTypes)[number];

export const ChatNotificationLevels = ['ALL', 'MENTIONS', 'NONE'] as const;
export type ChatNotificationLevel = (typeof ChatNotificationLevels)[number];

export const ChatAttachmentKinds = [
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'FILE',
  'LINK',
] as const;
export type ChatAttachmentKind = (typeof ChatAttachmentKinds)[number];

export const CHAT_MESSAGE_MAX_LENGTH = 10_000;
export const CHAT_ROOM_NAME_MAX_LENGTH = 120;
export const CHAT_ROOM_DESC_MAX_LENGTH = 500;
export const CHAT_MEMBERS_CREATE_MAX = 100;
export const CHAT_ATTACHMENTS_PER_MESSAGE_MAX = 20;
export const CHAT_MENTIONS_PER_MESSAGE_MAX = 50;
export const CHAT_PREVIEW_MAX_LENGTH = 280;
export const CHAT_MESSAGES_PAGE_MAX = 100;
export const CHAT_ROOMS_PAGE_MAX = 100;

export interface ChatLinkPreviewDto {
  url: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface ChatAttachmentDto {
  id: string;
  assetId: string | null;
  kind: ChatAttachmentKind;
  sortOrder: number;
  url?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
}

export interface ChatMentionDto {
  id: string;
  type: ChatMentionType;
  targetId: string;
  displayText: string;
  startOffset: number | null;
  endOffset: number | null;
}

export interface ChatReactionDto {
  emoji: string;
  count: number;
  viewerReacted: boolean;
}

export interface ChatMessageDto {
  id: string;
  roomId: string;
  senderId: string | null;
  clientMessageId: string | null;
  type: ChatMessageType;
  body: string;
  replyToId: string | null;
  linkPreview: ChatLinkPreviewDto | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  attachments: ChatAttachmentDto[];
  mentions: ChatMentionDto[];
  reactions: ChatReactionDto[];
}

export interface ChatMemberDto {
  userId: string;
  role: ChatMemberRole;
  canPost: boolean;
  canAddMembers: boolean;
  canManage: boolean;
  notificationLevel: ChatNotificationLevel;
  mutedUntil: string | null;
  lastReadMessageId: string | null;
  lastReadAt: string | null;
  pinnedAt: string | null;
  joinedAt: string;
}

export interface ChatRoomDto {
  id: string;
  type: ChatRoomType;
  name: string | null;
  description: string | null;
  avatarAssetId: string | null;
  clientId: string | null;
  createdById: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageId: string | null;
  memberCount: number;
  unreadCount: number;
  viewerRole: ChatMemberRole | null;
  viewerCanPost: boolean;
  members?: ChatMemberDto[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ChatMentionInput {
  type: ChatMentionType;
  targetId: string;
  displayText: string;
  startOffset?: number | null;
  endOffset?: number | null;
}

export interface ChatAttachmentInput {
  assetId?: string | null;
  kind: ChatAttachmentKind;
  url?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  fileName?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  sortOrder?: number;
}
