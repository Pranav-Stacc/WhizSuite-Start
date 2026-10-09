import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  RESOURCE_NAME_MAX_LENGTH,
  ReportStatuses,
  type ReportStatus,
} from '@agency-os/contracts';

export class CreateReportDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  title!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  periodEnd!: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}

export class UpdateReportDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  title?: string;

  @ApiProperty({ required: false, enum: ReportStatuses })
  @IsOptional()
  @IsIn(ReportStatuses)
  status?: ReportStatus;

  @ApiProperty({ required: false, format: 'date' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiProperty({ required: false, format: 'date' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}
