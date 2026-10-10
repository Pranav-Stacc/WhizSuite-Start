import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  CreateMediaDriveTransferInput,
  CreateMediaZipExportInput,
} from '@agency-os/contracts';

export class CreateMediaZipExportDto implements CreateMediaZipExportInput {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  filename?: string;
}

export class CreateMediaDriveTransferDto implements CreateMediaDriveTransferInput {
  @ApiProperty()
  @IsUUID()
  connectionId!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  transferAll: boolean = false;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  assetIds: string[] = [];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  driveFolderId?: string;
}
