import { Module } from '@nestjs/common';
import { TimeService } from './application/services/time.service';
import { TimeRepository } from './infrastructure/repositories/time.repository';
import { TimeResourceController } from './interface/http/controllers/time-resource.controller';

@Module({
  controllers: [TimeResourceController],
  providers: [TimeService, TimeRepository],
  exports: [TimeService, TimeRepository],
})
export class TimeModule {}
