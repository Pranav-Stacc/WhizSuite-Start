import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  FEEDBACK_SUBJECT_TYPE_VALUES,
  FeedbackThreadStatuses,
  RESOURCE_KEY_MAX_LENGTH,
  Visibilities,
  type FeedbackSubjectType,
  type FeedbackThreadStatus,
  type Visibility,
} from '@agency-os/contracts';

export class CreateFeedbackThreadDto {
  @ApiProperty({ enum: FEEDBACK_SUBJECT_TYPE_VALUES })
  @IsIn(FEEDBACK_SUBJECT_TYPE_VALUES)
  subjectType!: FeedbackSubjectType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(RESOURCE_KEY_MAX_LENGTH)
  subjectVersion!: string;

  @ApiProperty({ required: false, enum: Visibilities })
  @IsOptional()
  @IsIn(Visibilities)
  visibility?: Visibility;
}

export class UpdateFeedbackThreadDto {
  @ApiProperty({ required: false, enum: FeedbackThreadStatuses })
  @IsOptional()
  @IsIn(FeedbackThreadStatuses)
  status?: FeedbackThreadStatus;

  @ApiProperty({ required: false, enum: Visibilities })
  @IsOptional()
  @IsIn(Visibilities)
  visibility?: Visibility;
}
