import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  INBOX_HANDLE_MAX_LENGTH,
  INBOX_MESSAGE_MAX_LENGTH,
  InboxConversationStatuses,
  InboxConversationTypes,
  InboxPriorities,
  InboxSentiments,
  type InboxConversationStatus,
  type InboxConversationType,
  type InboxPriority,
  type InboxSentiment,
} from '@agency-os/contracts';

export class CreateConversationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ enum: InboxConversationTypes })
  @IsIn(InboxConversationTypes)
  type!: InboxConversationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(INBOX_HANDLE_MAX_LENGTH)
  authorHandle?: string;

  @ApiProperty({ required: false, description: 'First inbound message' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(INBOX_MESSAGE_MAX_LENGTH)
  body?: string;

  @ApiProperty({ required: false, enum: InboxPriorities })
  @IsOptional()
  @IsIn(InboxPriorities)
  priority?: InboxPriority;

  @ApiProperty({ required: false, enum: InboxSentiments })
  @IsOptional()
  @IsIn(InboxSentiments)
  sentiment?: InboxSentiment;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  slaDueAt?: string;
}

export class UpdateConversationDto {
  @ApiProperty({ required: false, enum: InboxConversationStatuses })
  @IsOptional()
  @IsIn(InboxConversationStatuses)
  status?: InboxConversationStatus;

  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'null unassigns',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  @ApiProperty({ required: false, enum: InboxPriorities })
  @IsOptional()
  @IsIn(InboxPriorities)
  priority?: InboxPriority;

  @ApiProperty({ required: false, enum: InboxSentiments })
  @IsOptional()
  @IsIn(InboxSentiments)
  sentiment?: InboxSentiment;
}

export class ReplyConversationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(INBOX_MESSAGE_MAX_LENGTH)
  body!: string;
}
