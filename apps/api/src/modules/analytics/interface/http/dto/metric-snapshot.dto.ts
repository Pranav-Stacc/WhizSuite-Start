import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const METRIC_KEY_MAX = 64;
const METRIC_KEYS_SEPARATOR = ',';

export class ListMetricSnapshotsQuery {
  @ApiProperty({
    required: false,
    description: 'Only snapshots recorded at or after this ISO timestamp.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    required: false,
    description:
      'Comma-separated metric keys, e.g. reach,engagement,followers.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(METRIC_KEYS_SEPARATOR)
          .map((k) => k.trim())
          .filter(Boolean)
      : value,
  )
  @IsString({ each: true })
  @MaxLength(METRIC_KEY_MAX, { each: true })
  metrics?: string[];
}

export class CreateMetricSnapshotDto {
  @ApiProperty()
  @IsString()
  @MaxLength(METRIC_KEY_MAX)
  metricKey!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  contentVariantId?: string;

  @ApiProperty()
  @IsNumber()
  value!: number;

  @ApiProperty()
  @IsDateString()
  recordedAt!: string;
}
