import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  RESOURCE_KEY_MAX_LENGTH,
  RESOURCE_TEXT_MAX_LENGTH,
  Visibilities,
  type Visibility,
} from '@agency-os/contracts';

export class CreateActivityDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  verb!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  entityType!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  entityId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_TEXT_MAX_LENGTH)
  summary!: string;

  @ApiProperty({ required: false, enum: Visibilities })
  @IsOptional()
  @IsIn(Visibilities)
  visibility?: Visibility;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
