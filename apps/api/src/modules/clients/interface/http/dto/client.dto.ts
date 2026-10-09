import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsUUID()
  workspaceId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateClientDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ required: false, example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateBrandKitDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  voiceTone?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  colors?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  hashtagSets?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  contentPillars?: Record<string, unknown>;
}
