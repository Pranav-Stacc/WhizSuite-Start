import { Module } from '@nestjs/common';
import { EngagementService } from './application/services/engagement.service';
import { EngagementRepository } from './infrastructure/repositories/engagement.repository';
import { EngagementResourceController } from './interface/http/controllers/engagement-resource.controller';

@Module({
  controllers: [EngagementResourceController],
  providers: [EngagementService, EngagementRepository],
  exports: [EngagementService, EngagementRepository],
})
export class EngagementModule {}
