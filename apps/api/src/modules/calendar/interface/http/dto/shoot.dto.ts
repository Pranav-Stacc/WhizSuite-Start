import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateShootInput } from '@agency-os/contracts';

export class CreateShootDto implements CreateShootInput {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allDay: boolean = true;

  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  createFolders: boolean = true;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskTitles: string[] = [];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  syncToGoogle: boolean = false;
}
