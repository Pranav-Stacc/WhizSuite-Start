import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
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
  @ApiProperty()
  @IsUUID()
  projectId!: string;

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

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

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

  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'null unassigns',
  })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string | null;
}

export class TransitionTaskDto {
  @ApiProperty({ enum: TaskStatuses })
  @IsIn(TaskStatuses)
  toStatus!: TaskStatus;
}
