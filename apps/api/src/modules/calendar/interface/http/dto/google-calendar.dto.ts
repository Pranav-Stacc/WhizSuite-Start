import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CalendarSyncDirections,
  type CalendarSyncDirection,
} from '@agency-os/contracts';

export class UpdateGoogleCalendarSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalCalendarId?: string;

  @ApiProperty({ required: false, enum: CalendarSyncDirections })
  @IsOptional()
  @IsIn(CalendarSyncDirections)
  syncDirection?: CalendarSyncDirection;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  defaultSyncNewEvents?: boolean;
}

export class PullGoogleCalendarDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  from!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  to!: string;
}
