import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  APPROVAL_STEPS_MAX,
  ApprovalActions,
  ApprovalStepRules,
  RESOURCE_KEY_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_TEXT_MAX_LENGTH,
  type ApprovalAction,
  type ApprovalStepRule,
} from '@agency-os/contracts';

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
  /** Users who may act on this step; empty means anyone holding the approve permission. */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  approverIds?: string[];
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
