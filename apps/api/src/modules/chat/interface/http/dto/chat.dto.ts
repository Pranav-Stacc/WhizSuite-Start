import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CHAT_ATTACHMENTS_PER_MESSAGE_MAX,
  CHAT_MENTIONS_PER_MESSAGE_MAX,
  CHAT_MEMBERS_CREATE_MAX,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_MESSAGES_PAGE_MAX,
  CHAT_ROOM_DESC_MAX_LENGTH,
  CHAT_ROOM_NAME_MAX_LENGTH,
  ChatAttachmentKinds,
  ChatMemberRoles,
  ChatMentionTypes,
  ChatMessageTypes,
  ChatNotificationLevels,
  type ChatAttachmentKind,
  type ChatMemberRole,
  type ChatMentionType,
  type ChatMessageType,
  type ChatNotificationLevel,
} from '@agency-os/contracts';

export class ChatMentionDto {
  @ApiProperty({ enum: ChatMentionTypes })
  @IsIn(ChatMentionTypes)
  type!: ChatMentionType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  targetId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  startOffset?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  endOffset?: number | null;
}

export class ChatAttachmentDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assetId?: string | null;

  @ApiProperty({ enum: ChatAttachmentKinds })
  @IsIn(ChatAttachmentKinds)
  kind!: ChatAttachmentKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  mimeType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

const CREATABLE_ROOM_TYPES = ['GROUP', 'CLIENT'] as const;

export class CreateGroupRoomDto {
  @ApiProperty({ enum: CREATABLE_ROOM_TYPES })
  @IsIn(CREATABLE_ROOM_TYPES)
  type!: (typeof CREATABLE_ROOM_TYPES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_ROOM_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(CHAT_ROOM_DESC_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((o: CreateGroupRoomDto) => o.type === 'CLIENT')
  @IsUUID()
  clientId?: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(CHAT_MEMBERS_CREATE_MAX)
  @IsUUID(undefined, { each: true })
  memberUserIds!: string[];
}

export class CreateDmDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_ROOM_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(CHAT_ROOM_DESC_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  avatarAssetId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class AddMembersDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMaxSize(CHAT_MEMBERS_CREATE_MAX)
  @IsUUID(undefined, { each: true })
  userIds!: string[];

  @ApiPropertyOptional({ enum: ChatMemberRoles })
  @IsOptional()
  @IsIn(ChatMemberRoles)
  role?: ChatMemberRole;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ enum: ChatNotificationLevels })
  @IsOptional()
  @IsIn(ChatNotificationLevels)
  notificationLevel?: ChatNotificationLevel;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  mutedUntil?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ enum: ChatMemberRoles })
  @IsOptional()
  @IsIn(ChatMemberRoles)
  role?: ChatMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPost?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canAddMembers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManage?: boolean;
}

export class LinkPreviewDto {
  @ApiProperty()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null;
}

export class SendMessageDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientMessageId?: string;

  @ApiPropertyOptional({ enum: ChatMessageTypes })
  @IsOptional()
  @IsIn(ChatMessageTypes)
  type?: ChatMessageType;

  @ApiProperty()
  @IsString()
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  body!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ type: LinkPreviewDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinkPreviewDto)
  linkPreview?: LinkPreviewDto;

  @ApiPropertyOptional({ type: [ChatAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_ATTACHMENTS_PER_MESSAGE_MAX)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional({ type: [ChatMentionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_MENTIONS_PER_MESSAGE_MAX)
  @ValidateNested({ each: true })
  @Type(() => ChatMentionDto)
  mentions?: ChatMentionDto[];

  /** When true, the browser streams @Whiz and posts the reply — skip server-side invoke. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  whizClientStream?: boolean;
}

export class WhizRoomReplyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  triggerMessageId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  body!: string;
}

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  body!: string;
}

export class MarkReadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  messageId!: string;
}

export class TypingDto {
  @ApiProperty()
  @IsBoolean()
  typing!: boolean;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: CHAT_MESSAGES_PAGE_MAX })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CHAT_MESSAGES_PAGE_MAX)
  limit?: number;
}
