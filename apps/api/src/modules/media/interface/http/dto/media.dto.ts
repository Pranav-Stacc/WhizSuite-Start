import { ApiProperty } from '@nestjs/swagger';
import {
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
  type MediaDownloadDisposition,
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
}

export class MediaDownloadQueryDto {
  @ApiProperty({ required: false, enum: MediaDownloadDispositions })
  @IsOptional()
  @IsIn(MediaDownloadDispositions)
  disposition?: MediaDownloadDisposition;
}
