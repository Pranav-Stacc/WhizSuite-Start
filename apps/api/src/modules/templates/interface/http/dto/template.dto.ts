import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  RESOURCE_NAME_MAX_LENGTH,
  TemplateScopes,
  TemplateTypes,
  type TemplateScope,
  type TemplateType,
} from '@agency-os/contracts';

export class CreateTemplateDto {
  @ApiProperty({ enum: TemplateTypes })
  @IsIn(TemplateTypes)
  type!: TemplateType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ required: false, enum: TemplateScopes })
  @IsOptional()
  @IsIn(TemplateScopes)
  scope?: TemplateScope;

  @ApiProperty({ type: Object })
  @IsObject()
  definition!: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ required: false, enum: TemplateScopes })
  @IsOptional()
  @IsIn(TemplateScopes)
  scope?: TemplateScope;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;
}
