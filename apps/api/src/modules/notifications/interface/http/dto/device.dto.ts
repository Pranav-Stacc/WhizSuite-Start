import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DEVICE_META_MAX_LENGTH,
  DEVICE_TOKEN_MAX_LENGTH,
  DevicePlatforms,
  type DevicePlatform,
  type RegisterDeviceInput,
} from '@agency-os/contracts';

export class RegisterDeviceDto implements RegisterDeviceInput {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(DEVICE_TOKEN_MAX_LENGTH)
  token!: string;
  @ApiProperty({ enum: DevicePlatforms })
  @IsIn(DevicePlatforms)
  platform!: DevicePlatform;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(DEVICE_META_MAX_LENGTH)
  appVersion?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(DEVICE_META_MAX_LENGTH)
  locale?: string;
}
