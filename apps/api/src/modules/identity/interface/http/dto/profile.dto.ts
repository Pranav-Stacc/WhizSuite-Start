import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  PROFILE_JOB_TITLE_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from '@agency-os/contracts';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: PROFILE_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(PROFILE_NAME_MAX_LENGTH)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: PROFILE_NAME_MAX_LENGTH, nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(PROFILE_NAME_MAX_LENGTH)
  lastName?: string | null;

  @ApiPropertyOptional({
    maxLength: PROFILE_JOB_TITLE_MAX_LENGTH,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(PROFILE_JOB_TITLE_MAX_LENGTH)
  jobTitle?: string | null;
}
