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
  type GoogleCalendarSyncTypes,
} from '@agency-os/contracts';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

class GoogleCalendarSyncTypesDto implements GoogleCalendarSyncTypes {
  @IsBoolean()
  meetings!: boolean;

  @IsBoolean()
  shoots!: boolean;

  @IsBoolean()
  tasks!: boolean;

  @IsBoolean()
  posts!: boolean;
}

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

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GoogleCalendarSyncTypesDto)
  syncTypes?: GoogleCalendarSyncTypesDto;
}

export class BeginGoogleCalendarConnectDto {
  @ApiProperty({ required: false, enum: ['mobile', 'web'] })
  @IsOptional()
  @IsIn(['mobile', 'web'])
  returnTo?: 'mobile' | 'web';
}

export class PullGoogleCalendarDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  from!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  to!: string;
}
