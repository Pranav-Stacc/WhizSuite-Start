import { ApiProperty } from '@nestjs/swagger';
import {
  MAX_WORKFLOW_SLA_HOURS,
  MAX_WORKFLOW_STAGES,
  MIN_WORKFLOW_STAGES,
} from '@agency-os/contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const NAME_MIN = 2;
const NAME_MAX = 200;
const STAGE_MAX = 80;
const DEFAULT_ENTITY_TYPE = 'content';

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  name!: string;

  @ApiProperty({ required: false, default: DEFAULT_ENTITY_TYPE })
  @IsOptional()
  @IsString()
  entityType: string = DEFAULT_ENTITY_TYPE;

  @ApiProperty({
    type: [String],
    description:
      'Ordered stage names; the first is initial, the last terminal.',
  })
  @IsArray()
  @ArrayMinSize(MIN_WORKFLOW_STAGES)
  @ArrayMaxSize(MAX_WORKFLOW_STAGES)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(STAGE_MAX, { each: true })
  stages!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WORKFLOW_SLA_HOURS)
  slaHours?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  requiresClientApproval?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateWorkflowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(MIN_WORKFLOW_STAGES)
  @ArrayMaxSize(MAX_WORKFLOW_STAGES)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(STAGE_MAX, { each: true })
  stages?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WORKFLOW_SLA_HOURS)
  slaHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiresClientApproval?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
