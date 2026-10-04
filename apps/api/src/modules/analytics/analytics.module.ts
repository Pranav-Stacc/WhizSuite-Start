import { Module } from '@nestjs/common';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsRepository } from './infrastructure/repositories/analytics.repository';
import { AnalyticsResourceController } from './interface/http/controllers/analytics-resource.controller';

@Module({
  controllers: [AnalyticsResourceController],
  providers: [AnalyticsService, AnalyticsRepository],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
