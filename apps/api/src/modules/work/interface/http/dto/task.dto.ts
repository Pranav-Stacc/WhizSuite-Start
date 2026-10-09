import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  Priorities,
  TaskStatuses,
  type Priority,
  type TaskStatus,
} from '@agency-os/contracts';

/** One working year of minutes; guards against unit mix-ups (hours sent as minutes, etc.). */
const TASK_ESTIMATE_MAX_MINUTES = 60 * 24 * 365;

export class CreateTaskDto {
  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Optional project; omit for inbox / unscoped tasks',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Optional client when there is no project',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, enum: TaskStatuses })
  @IsOptional()
  @IsIn(TaskStatuses)
  status?: TaskStatus;

  @ApiProperty({ required: false, enum: Priorities })
  @IsOptional()
  @IsIn(Priorities)
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TASK_ESTIMATE_MAX_MINUTES)
  estimateMinutes?: number;

  /** @deprecated Prefer assigneeUserIds. */
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiProperty({ required: false, type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUserIds?: string[];

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  calendarItemId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  contentItemId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'null clears the project link',
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'null clears the client link',
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  clientId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: Priorities })
  @IsOptional()
  @IsIn(Priorities)
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(TASK_ESTIMATE_MAX_MINUTES)
  estimateMinutes?: number;

  /** @deprecated Prefer assigneeUserIds. null unassigns all when sent alone. */
  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'null unassigns',
  })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    format: 'uuid',
    description: 'Replaces the full assignee set when provided',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUserIds?: string[];

  @ApiProperty({ required: false, format: 'uuid', nullable: true })
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsUUID()
  contentItemId?: string | null;
}

export class TransitionTaskDto {
  @ApiProperty({ enum: TaskStatuses })
  @IsIn(TaskStatuses)
  toStatus!: TaskStatus;
}

export class CreateTaskCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;
}
