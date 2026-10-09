import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  CalendarSourceTypes,
  type CalendarSourceType,
} from '@agency-os/contracts';

function asStringList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return undefined;
}

export class CalendarFeedQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive range start (ISO datetime)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Exclusive range end (ISO datetime)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Narrow to one client (must be in scope)' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({
    enum: CalendarSourceTypes,
    isArray: true,
    description: 'Optional layer filter; omit for all layers',
  })
  @IsOptional()
  @Transform(({ value }) => asStringList(value))
  @IsArray()
  @ArrayUnique()
  @IsIn(CalendarSourceTypes, { each: true })
  types?: CalendarSourceType[];
}
