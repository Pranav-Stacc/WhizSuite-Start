import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  DEPARTMENT_NAME_MAX_LENGTH,
  DEPARTMENT_NAME_MIN_LENGTH,
  DESIGNATION_NAME_MAX_LENGTH,
  DESIGNATION_NAME_MIN_LENGTH,
} from '@agency-os/contracts';

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(DEPARTMENT_NAME_MIN_LENGTH)
  @MaxLength(DEPARTMENT_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(DEPARTMENT_NAME_MIN_LENGTH)
  @MaxLength(DEPARTMENT_NAME_MAX_LENGTH)
  name?: string;

  /** Omit to leave unchanged; `null` moves the department to the top level. */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  parentId?: string | null;
}

export class CreateDesignationDto {
  @ApiProperty()
  @IsString()
  @MinLength(DESIGNATION_NAME_MIN_LENGTH)
  @MaxLength(DESIGNATION_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}

export class UpdateDesignationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(DESIGNATION_NAME_MIN_LENGTH)
  @MaxLength(DESIGNATION_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}
