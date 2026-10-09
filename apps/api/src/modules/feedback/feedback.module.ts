import { Module } from '@nestjs/common';
import { FeedbackService } from './application/services/feedback.service';
import { FeedbackRepository } from './infrastructure/repositories/feedback.repository';
import { FeedbackResourceController } from './interface/http/controllers/feedback-resource.controller';
import { FeedbackSubjectCommentsController } from './interface/http/controllers/feedback-subject-comments.controller';

@Module({
  controllers: [FeedbackResourceController, FeedbackSubjectCommentsController],
  providers: [FeedbackService, FeedbackRepository],
  exports: [FeedbackService, FeedbackRepository],
})
export class FeedbackModule {}
