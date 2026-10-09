import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_TYPE_MAX_LENGTH,
  ProjectStatuses,
  type ProjectCreateInput,
  type ProjectStatus,
  type ProjectUpdateInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto implements ProjectCreateInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ maxLength: PROJECT_NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(PROJECT_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ required: false, maxLength: PROJECT_TYPE_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(PROJECT_TYPE_MAX_LENGTH)
  type?: string;

  @ApiProperty({ required: false, enum: ProjectStatuses })
  @IsOptional()
  @IsIn(ProjectStatuses)
  status?: ProjectStatus;

  @ApiProperty({ required: false, format: 'date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, format: 'date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetMinor?: number;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;
}

export class UpdateProjectDto
  extends PartialType(OmitType(CreateProjectDto, ['clientId'] as const))
  implements ProjectUpdateInput {}
