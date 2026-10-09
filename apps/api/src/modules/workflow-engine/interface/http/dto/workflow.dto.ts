import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  MAX_WORKFLOW_SLA_HOURS,
  MAX_WORKFLOW_STAGE_LENGTH,
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
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const NAME_MIN = 2;
const NAME_MAX = 200;
const DEFAULT_ENTITY_TYPE = 'content';

export class WorkflowStageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_WORKFLOW_STAGE_LENGTH)
  name!: string;

  @ApiProperty({
    required: false,
    format: 'uuid',
    nullable: true,
    description: 'Workflow role used as the default assignee pool for this stage.',
  })
  @IsOptional()
  @IsUUID('4')
  assigneeRoleId?: string | null;
}

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
    type: [WorkflowStageDto],
    description:
      'Ordered stages; the first is initial, the last terminal. Optional assigneeRoleId ties a stage to a workflow role.',
  })
  @IsArray()
  @ArrayMinSize(MIN_WORKFLOW_STAGES)
  @ArrayMaxSize(MAX_WORKFLOW_STAGES)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages!: WorkflowStageDto[];

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

  @ApiProperty({ required: false, type: [WorkflowStageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(MIN_WORKFLOW_STAGES)
  @ArrayMaxSize(MAX_WORKFLOW_STAGES)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages?: WorkflowStageDto[];

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
