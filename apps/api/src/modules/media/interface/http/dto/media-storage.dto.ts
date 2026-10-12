import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type {
  CreateMediaDriveImportInput,
  CreateMediaDriveTransferInput,
  CreateMediaZipExportInput,
} from '@agency-os/contracts';

export class BeginGoogleDriveConnectDto {
  @ApiProperty({ required: false, enum: ['mobile', 'web'] })
  @IsOptional()
  @IsIn(['mobile', 'web'])
  returnTo?: 'mobile' | 'web';
}

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

export class CreateMediaDriveImportDto implements CreateMediaDriveImportInput {
  @ApiProperty()
  @IsUUID()
  connectionId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(256, { each: true })
  driveFileIds!: string[];

  @ApiProperty()
  @IsUUID()
  clientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  folderId?: string;
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
