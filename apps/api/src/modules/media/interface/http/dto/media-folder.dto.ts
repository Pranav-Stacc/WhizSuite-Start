import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  MEDIA_FILENAME_MAX_LENGTH,
  Visibilities,
  type CreateMediaFolderInput,
  type UpdateMediaFolderInput,
  type Visibility,
} from '@agency-os/contracts';
import { Transform } from 'class-transformer';

export class CreateMediaFolderDto implements CreateMediaFolderInput {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(MEDIA_FILENAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  clientId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  projectId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  calendarItemId?: string | null;

  @ApiProperty({ enum: Visibilities, required: false })
  @IsOptional()
  @IsIn(Visibilities)
  visibility: Visibility = 'INTERNAL';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateMediaFolderDto implements UpdateMediaFolderInput {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(MEDIA_FILENAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ enum: Visibilities, required: false })
  @IsOptional()
  @IsIn(Visibilities)
  visibility?: Visibility;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class EnsureClientFoldersDto {
  @ApiProperty()
  @IsUUID()
  clientId!: string;
}

export class ListMediaFoldersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  clientId?: string;

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
  @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  clientVisibleOnly?: boolean;
}
