import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  LEAD_NEXT_STEP_MAX_LENGTH,
  LEAD_TEXT_MAX_LENGTH,
  LeadStages,
  type LeadCreateInput,
  type LeadStage,
  type LeadUpdateInput,
} from '@agency-os/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const isNotEmpty = (_: object, value: unknown) => value !== '';

export class CreateLeadDto implements LeadCreateInput {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  companyName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  brandName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  website?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  source?: string;

  @ApiProperty({ required: false, enum: LeadStages })
  @IsOptional()
  @IsIn(LeadStages)
  stage?: LeadStage;

  @ApiProperty({
    required: false,
    minimum: 0,
    description: 'Estimated value in minor units',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  valueMinor?: number;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_TEXT_MAX_LENGTH)
  contactName?: string;

  @ApiProperty({
    required: false,
    description: 'Empty string clears the value',
  })
  @IsOptional()
  @Transform(trim)
  @ValidateIf(isNotEmpty)
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(LEAD_NEXT_STEP_MAX_LENGTH)
  nextStep?: string;

  @ApiProperty({
    required: false,
    description: 'Empty string clears the value',
  })
  @IsOptional()
  @ValidateIf(isNotEmpty)
  @IsISO8601()
  nextStepAt?: string;
}

export class UpdateLeadDto
  extends PartialType(CreateLeadDto)
  implements LeadUpdateInput
{
  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  convertedClientId?: string;
}
