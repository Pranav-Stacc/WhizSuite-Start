import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ApiContentTypes,
  CONTENT_CAPTION_MAX_LENGTH,
  CONTENT_CTA_URL_MAX_LENGTH,
  CONTENT_HASHTAG_MAX_LENGTH,
  CONTENT_PILLAR_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH,
  ContentCreatableStatuses,
  ContentReviewOutcomes,
  ContentStatuses,
  HASHTAG_PATTERN,
  Platforms,
  type ApiContentType,
  type ContentCreatableStatus,
  type ContentItemCreateInput,
  type ContentItemUpdateInput,
  type ContentListQuery,
  type ContentReorderInput,
  type ContentReviewOutcome,
  type ContentStatus,
  type ContentTransitionInput,
  type Platform,
} from '@agency-os/contracts';

const URL_OPTIONS = { require_protocol: true, protocols: ['http', 'https'] };
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const isNotNull = (_: object, value: unknown) => value !== null;

export class CreateContentDto implements ContentItemCreateInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiProperty({
    description: 'Internal name',
    maxLength: CONTENT_TITLE_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CONTENT_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ required: false, maxLength: CONTENT_CAPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_CAPTION_MAX_LENGTH)
  caption?: string;

  @ApiProperty({ enum: ApiContentTypes })
  @IsIn(ApiContentTypes)
  contentType!: ApiContentType;

  @ApiProperty({ required: false, maxLength: CONTENT_PILLAR_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(CONTENT_PILLAR_MAX_LENGTH)
  pillar?: string;

  @ApiProperty({ required: false, enum: Platforms, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(Platforms, { each: true })
  platforms?: Platform[];

  @ApiProperty({
    required: false,
    type: [String],
    description: "Normalized to start with '#', deduplicated",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(CONTENT_HASHTAG_MAX_LENGTH, { each: true })
  @Matches(HASHTAG_PATTERN, { each: true })
  hashtags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(CONTENT_CTA_URL_MAX_LENGTH)
  ctaUrl?: string;

  @ApiProperty({ required: false, nullable: true, format: 'date-time' })
  @IsOptional()
  @ValidateIf(isNotNull)
  @IsISO8601({ strict: true })
  scheduledAt?: string | null;

  @ApiProperty({ required: false, enum: ContentCreatableStatuses })
  @IsOptional()
  @IsIn(ContentCreatableStatuses)
  status?: ContentCreatableStatus;

  @ApiProperty({
    required: false,
    type: [String],
    format: 'uuid',
    description: 'Ordered media asset ids',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  mediaAssetIds?: string[];
}

export class UpdateContentDto implements ContentItemUpdateInput {
  @ApiProperty({ required: false, maxLength: CONTENT_TITLE_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CONTENT_TITLE_MAX_LENGTH)
  title?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: CONTENT_CAPTION_MAX_LENGTH,
  })
  @IsOptional()
  @ValidateIf(isNotNull)
  @IsString()
  @MaxLength(CONTENT_CAPTION_MAX_LENGTH)
  caption?: string | null;

  @ApiProperty({ required: false, enum: ApiContentTypes })
  @IsOptional()
  @IsIn(ApiContentTypes)
  contentType?: ApiContentType;

  @ApiProperty({
    required: false,
    nullable: true,
    maxLength: CONTENT_PILLAR_MAX_LENGTH,
  })
  @IsOptional()
  @ValidateIf(isNotNull)
  @Transform(trim)
  @IsString()
  @MaxLength(CONTENT_PILLAR_MAX_LENGTH)
  pillar?: string | null;

  @ApiProperty({ required: false, enum: Platforms, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn(Platforms, { each: true })
  platforms?: Platform[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(CONTENT_HASHTAG_MAX_LENGTH, { each: true })
  @Matches(HASHTAG_PATTERN, { each: true })
  hashtags?: string[];

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf(isNotNull)
  @IsUrl(URL_OPTIONS)
  @MaxLength(CONTENT_CTA_URL_MAX_LENGTH)
  ctaUrl?: string | null;

  @ApiProperty({ required: false, nullable: true, format: 'date-time' })
  @IsOptional()
  @ValidateIf(isNotNull)
  @IsISO8601({ strict: true })
  scheduledAt?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    format: 'uuid',
    description: 'Replaces the ordered media list',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  mediaAssetIds?: string[];

  @ApiProperty({
    required: false,
    description: 'Optimistic lock; 409 CONTENT_VERSION_CONFLICT on mismatch',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  expectedVersion?: number;
}

export class ReorderContentDto implements ContentReorderInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'gridPosition is set to each id index',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  orderedIds!: string[];
}

export class TransitionContentDto implements ContentTransitionInput {
  @ApiProperty({ enum: ContentStatuses })
  @IsIn(ContentStatuses)
  toStatus!: ContentStatus;

  @ApiProperty({
    required: false,
    description:
      'When toStatus is PUBLISHED: true (default) queues live Instagram publish; false only marks status.',
  })
  @IsOptional()
  @IsBoolean()
  livePublish?: boolean;
}

export class ReviewContentDto {
  @ApiProperty({ enum: ContentReviewOutcomes })
  @IsIn(ContentReviewOutcomes)
  toStatus!: ContentReviewOutcome;
}

export class ListContentQueryDto implements ContentListQuery {
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    required: false,
    format: 'date-time',
    description: 'Inclusive lower bound on scheduledAt',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiProperty({
    required: false,
    format: 'date-time',
    description: 'Exclusive upper bound on scheduledAt',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiProperty({ required: false, enum: ContentStatuses })
  @IsOptional()
  @IsIn(ContentStatuses)
  status?: ContentStatus;
}
