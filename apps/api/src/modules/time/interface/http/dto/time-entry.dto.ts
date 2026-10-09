import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TIME_ENTRY_MINUTES_MAX,
  TIME_ENTRY_NOTE_MAX_LENGTH,
  type TimeEntryCreateInput,
  type TimerStartInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTimeEntryDto implements TimeEntryCreateInput {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty({ minimum: 1, maximum: TIME_ENTRY_MINUTES_MAX })
  @IsInt()
  @Min(1)
  @Max(TIME_ENTRY_MINUTES_MAX)
  minutes!: number;

  @ApiProperty({ format: 'date' })
  @IsISO8601()
  date!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(TIME_ENTRY_NOTE_MAX_LENGTH)
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  billable?: boolean;
}

export class StartTimerDto implements TimerStartInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  taskId!: string;
}
