import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
import {
  APPROVAL_STEPS_MAX,
  ApprovalActions,
  ApproverBases,
  ApprovalStepRules,
  AssignableScopeTypes,
  RESOURCE_KEY_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_TEXT_MAX_LENGTH,
  type ApprovalAction,
  type ApprovalStepRule,
  type ApproverBasis,
} from '@agency-os/contracts';

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

export class ApprovalStepDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ enum: ApprovalStepRules })
  @IsOptional()
  @IsIn(ApprovalStepRules)
  rule?: ApprovalStepRule;

  @ApiPropertyOptional({
    description: 'Required approvals when rule is QUORUM',
  })
  @ValidateIf((step: ApprovalStepDto) => step.rule === 'QUORUM')
  @IsInt()
  @Min(1)
  @Max(MAX_QUORUM)
  quorumCount?: number;

  /** Concrete users who may act; empty + empty roles = anyone with approve permission. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  approverIds?: string[];

  /** Roles whose holders join the approver pool (optionally scoped). */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ enum: ApproverBases })
  @IsOptional()
  @IsIn(ApproverBases)
  basis?: ApproverBasis;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  targetIds?: string[];

  /** People assigned to the subject, used when basis is ASSIGNEE. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_APPROVERS)
  @IsUUID('4', { each: true })
  assigneeUserIds?: string[];

  @ApiPropertyOptional({ enum: SCOPE_TYPES })
  @IsOptional()
  @IsIn(SCOPE_TYPES)
  scopeType?: (typeof SCOPE_TYPES)[number];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID('4')
  scopeResourceId?: string | null;
}

export class CreateApprovalDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  subjectType!: string;
  @ApiProperty() @IsUUID() subjectId!: string;
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  subjectVersion!: string;
  @ApiProperty({ type: [ApprovalStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(APPROVAL_STEPS_MAX)
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps!: ApprovalStepDto[];

  @ApiPropertyOptional({ description: 'SLA deadline for the full request' })
  @IsOptional()
  @IsString()
  dueAt?: string;
}

export class ActApprovalDto {
  @ApiProperty({ enum: ApprovalActions })
  @IsIn(ApprovalActions)
  action!: ApprovalAction;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(RESOURCE_TEXT_MAX_LENGTH)
  comment?: string;
}
