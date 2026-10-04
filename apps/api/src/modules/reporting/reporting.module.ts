import { Module } from '@nestjs/common';
import { ReportingService } from './application/services/reporting.service';
import { ReportingRepository } from './infrastructure/repositories/reporting.repository';
import { ReportingResourceController } from './interface/http/controllers/reporting-resource.controller';

@Module({
  controllers: [ReportingResourceController],
  providers: [ReportingService, ReportingRepository],
  exports: [ReportingService, ReportingRepository],
})
export class ReportingModule {}
