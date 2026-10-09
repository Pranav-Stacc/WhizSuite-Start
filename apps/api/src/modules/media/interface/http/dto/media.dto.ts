import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  MEDIA_FILENAME_MAX_LENGTH,
  MIME_TYPE_PATTERN,
  MediaDownloadDispositions,
  MediaUsageSubjectTypes,
  type MediaDownloadDisposition,
  type MediaUsageSubjectType,
  type PresignMediaUploadInput,
  type UpdateMediaAssetInput,
} from '@agency-os/contracts';

export class PresignMediaUploadDto implements PresignMediaUploadInput {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(MEDIA_FILENAME_MAX_LENGTH)
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @Matches(MIME_TYPE_PATTERN)
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  @IsPositive()
  sizeBytes!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  calendarItemId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateMediaAssetDto implements UpdateMediaAssetInput {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MEDIA_FILENAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  clientId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  folderId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  calendarItemId?: string | null;
}

export class MediaDownloadQueryDto {
  @ApiProperty({ required: false, enum: MediaDownloadDispositions })
  @IsOptional()
  @IsIn(MediaDownloadDispositions)
  disposition?: MediaDownloadDisposition;
}

export class ListMediaAssetsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  calendarItemId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  clientVisibleOnly?: boolean;
}

export class TagMediaAssetDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
}

export class RecordMediaUsageDto {
  @ApiProperty()
  @IsUUID()
  assetId!: string;

  @ApiProperty({ enum: MediaUsageSubjectTypes })
  @IsIn(MediaUsageSubjectTypes)
  subjectType!: MediaUsageSubjectType;

  @ApiProperty()
  @IsUUID()
  subjectId!: string;
}
