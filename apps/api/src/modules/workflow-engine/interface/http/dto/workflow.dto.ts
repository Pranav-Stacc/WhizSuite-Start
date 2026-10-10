import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ApprovalStepRules,
  AssignableScopeTypes,
  MAX_WORKFLOW_SLA_HOURS,
  MAX_WORKFLOW_STAGE_LENGTH,
  MAX_WORKFLOW_STAGES,
  MIN_WORKFLOW_STAGES,
  type ApprovalStepRule,
} from '@agency-os/contracts';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const NAME_MIN = 2;
const NAME_MAX = 200;
const DEFAULT_ENTITY_TYPE = 'content';
const MAX_APPROVERS = 50;
const MAX_QUORUM = 50;

const SCOPE_TYPES = [
  AssignableScopeTypes.ORGANIZATION,
  AssignableScopeTypes.CLIENT,
  AssignableScopeTypes.PROJECT,
  AssignableScopeTypes.WORKSPACE,
  AssignableScopeTypes.TEAM,
  AssignableScopeTypes.DEPARTMENT,
] as const;

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
    description:
      'Legacy single workflow-role assignee; merged into roleIds when set.',
  })
  @IsOptional()
  @IsUUID('4')
  assigneeRoleId?: string | null;

  @ApiProperty({
    required: false,
    enum: ApprovalStepRules,
    description: 'How many of the named pool must approve this stage.',
  })
  @IsOptional()
  @IsIn(ApprovalStepRules)
  approvalRule?: ApprovalStepRule;

  @ApiProperty({
    required: false,
    description: 'Required when approvalRule is QUORUM',
  })
  @ValidateIf((stage: WorkflowStageDto) => stage.approvalRule === 'QUORUM')
  @IsInt()
  @Min(1)
  @Max(MAX_QUORUM)
  quorumCount?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  approverIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiProperty({ required: false, enum: SCOPE_TYPES })
  @IsOptional()
  @IsIn(SCOPE_TYPES)
  scopeType?: (typeof SCOPE_TYPES)[number];

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsUUID('4')
  scopeResourceId?: string | null;
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
      'Ordered stages; the first is initial, the last terminal. Configure people, roles, and approval rule per stage.',
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
