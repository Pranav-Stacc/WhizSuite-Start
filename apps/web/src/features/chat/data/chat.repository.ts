import 'server-only';
import type {
  ChatMessageDto,
  ChatRoomDto,
  CursorPage,
} from '@agency-os/contracts';
import { createRepository, type Entity } from '@/shared/data/repository';

export interface ChatRoom extends Entity {
  type: 'DM' | 'GROUP' | 'CLIENT';
  name: string | null;
  description: string | null;
  clientId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  memberCount: number;
  unreadCount: number;
  viewerCanPost: boolean;
  memberUserIds: string[];
}

export interface ChatMessage extends Entity {
  roomId: string;
  senderId: string | null;
  body: string;
  createdAt: string;
  deletedAt: string | null;
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const ROOM_SEEDS: ChatRoom[] = [
  {
    id: 'chat-group-ops',
    type: 'GROUP',
    name: 'Agency ops',
    description: 'Day-to-day coordination',
    clientId: null,
    lastMessageAt: ago(12),
    lastMessagePreview: 'Can someone take the Verde shoot brief?',
    memberCount: 4,
    unreadCount: 2,
    viewerCanPost: true,
    memberUserIds: ['m-aarav', 'm-priya', 'm-rohan', 'm-meera'],
  },
  {
    id: 'chat-client-nimbus',
    type: 'CLIENT',
    name: 'Nimbus Cloud',
    description: null,
    clientId: 'c-nimbus',
    lastMessageAt: ago(45),
    lastMessagePreview: 'Looks good — ship the carousel.',
    memberCount: 3,
    unreadCount: 0,
    viewerCanPost: true,
    memberUserIds: ['m-aarav', 'm-priya', 'c-neha'],
  },
  {
    id: 'chat-dm-priya',
    type: 'DM',
    name: null,
    description: null,
    clientId: null,
    lastMessageAt: ago(90),
    lastMessagePreview: 'Ping me when the draft is ready',
    memberCount: 2,
    unreadCount: 1,
    viewerCanPost: true,
    memberUserIds: ['m-aarav', 'm-priya'],
  },
];

const MESSAGE_SEEDS: ChatMessage[] = [
  {
    id: 'cm1',
    roomId: 'chat-group-ops',
    senderId: 'm-priya',
    body: 'Morning — approvals queue is light today.',
    createdAt: ago(120),
    deletedAt: null,
  },
  {
    id: 'cm2',
    roomId: 'chat-group-ops',
    senderId: 'm-rohan',
    body: 'Can someone take the Verde shoot brief? @task Fix shot list',
    createdAt: ago(12),
    deletedAt: null,
  },
  {
    id: 'cm3',
    roomId: 'chat-client-nimbus',
    senderId: 'c-neha',
    body: 'Looks good — ship the carousel.',
    createdAt: ago(45),
    deletedAt: null,
  },
  {
    id: 'cm4',
    roomId: 'chat-dm-priya',
    senderId: 'm-priya',
    body: 'Ping me when the draft is ready',
    createdAt: ago(90),
    deletedAt: null,
  },
];

export const chatRoomsRepository = createRepository<ChatRoom>('chat-rooms', () => ROOM_SEEDS);
export const chatMessagesRepository = createRepository<ChatMessage>('chat-messages', () => MESSAGE_SEEDS);

export function toRoomDto(room: ChatRoom): ChatRoomDto {
  return {
    id: room.id,
    type: room.type,
    name: room.name,
    description: room.description,
    avatarAssetId: null,
    clientId: room.clientId,
    createdById: null,
    lastMessageAt: room.lastMessageAt,
    lastMessagePreview: room.lastMessagePreview,
    lastMessageId: null,
    memberCount: room.memberCount,
    unreadCount: room.unreadCount,
    viewerRole: 'MEMBER',
    viewerCanPost: room.viewerCanPost,
    createdAt: room.lastMessageAt ?? new Date().toISOString(),
    updatedAt: room.lastMessageAt ?? new Date().toISOString(),
    archivedAt: null,
  };
}

export function toMessageDto(message: ChatMessage): ChatMessageDto {
  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    clientMessageId: null,
    type: 'TEXT',
    body: message.body,
    replyToId: null,
    linkPreview: null,
    editedAt: null,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt,
    attachments: [],
    mentions: [],
    reactions: [],
  };
}

export async function demoListMessages(roomId: string): Promise<CursorPage<ChatMessageDto>> {
  const items = (await chatMessagesRepository.list())
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toMessageDto);
  return { items, nextCursor: null, hasMore: false };
}
