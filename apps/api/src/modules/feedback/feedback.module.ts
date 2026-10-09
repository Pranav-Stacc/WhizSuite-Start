import { Module } from '@nestjs/common';
import { SocialModule } from '../social/social.module';
import { FeedbackService } from './application/services/feedback.service';
import { FeedbackRepository } from './infrastructure/repositories/feedback.repository';
import { FeedbackResourceController } from './interface/http/controllers/feedback-resource.controller';
import { FeedbackSubjectCommentsController } from './interface/http/controllers/feedback-subject-comments.controller';

@Module({
  imports: [SocialModule],
  controllers: [FeedbackResourceController, FeedbackSubjectCommentsController],
  providers: [FeedbackService, FeedbackRepository],
  exports: [FeedbackService, FeedbackRepository],
})
export class FeedbackModule {}
