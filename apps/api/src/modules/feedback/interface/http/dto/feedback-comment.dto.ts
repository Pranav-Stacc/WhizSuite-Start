import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';
import {
  FEEDBACK_SUBJECT_TYPE_VALUES,
  type FeedbackCommentCreateInput,
  type FeedbackSubjectType,
} from '@agency-os/contracts';

export class FeedbackSubjectParamsDto {
  @ApiProperty()
  @IsString()
  organizationId!: string;

  @ApiProperty({ enum: FEEDBACK_SUBJECT_TYPE_VALUES })
  @IsIn(FEEDBACK_SUBJECT_TYPE_VALUES)
  subjectType!: FeedbackSubjectType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;
}

export class CreateFeedbackCommentDto implements FeedbackCommentCreateInput {
  @ApiProperty({
    description: 'Max length is FEEDBACK_COMMENT_MAX_LENGTH (server config)',
  })
  @IsString()
  @MinLength(1)
  body!: string;
}
