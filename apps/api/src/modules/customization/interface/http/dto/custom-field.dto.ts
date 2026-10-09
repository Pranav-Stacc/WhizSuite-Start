import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CustomFieldEntityTypes,
  CustomFieldTypes,
  RESOURCE_KEY_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  type CustomFieldEntityType,
  type CustomFieldType,
} from '@agency-os/contracts';

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export class CreateCustomFieldDto {
  @ApiProperty({ enum: CustomFieldEntityTypes })
  @IsIn(CustomFieldEntityTypes)
  entityType!: CustomFieldEntityType;

  @ApiProperty({ description: 'snake_case, unique per entity type' })
  @IsString()
  @Matches(FIELD_KEY_PATTERN)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  label!: string;

  @ApiProperty({ enum: CustomFieldTypes })
  @IsIn(CustomFieldTypes)
  type!: CustomFieldType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  clientVisible?: boolean;
}

export class UpdateCustomFieldDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  label?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  clientVisible?: boolean;
}
