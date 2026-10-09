import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { SocialService } from './application/services/social.service';
import { SocialRepository } from './infrastructure/repositories/social.repository';
import { SocialResourceController } from './interface/http/controllers/social-resource.controller';
import { PublishWorkerService } from './jobs/publish-worker.service';

@Module({
  imports: [MediaModule],
  controllers: [SocialResourceController],
  providers: [SocialService, SocialRepository, PublishWorkerService],
  exports: [SocialService],
})
export class SocialModule {}
