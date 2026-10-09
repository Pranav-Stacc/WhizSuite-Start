import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { WorkModule } from '../work/work.module';
import { TimeService } from './application/services/time.service';
import { TimeRepository } from './infrastructure/repositories/time.repository';
import { TimeResourceController } from './interface/http/controllers/time-resource.controller';
import { TimerController } from './interface/http/controllers/timer.controller';

@Module({
  imports: [IdentityModule, WorkModule],
  controllers: [TimeResourceController, TimerController],
  providers: [TimeService, TimeRepository],
  exports: [TimeService],
})
export class TimeModule {}
