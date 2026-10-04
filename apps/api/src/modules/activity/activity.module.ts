import { Module } from '@nestjs/common';
import { ActivityService } from './application/services/activity.service';
import { ActivityRepository } from './infrastructure/repositories/activity.repository';
import { ActivityResourceController } from './interface/http/controllers/activity-resource.controller';

@Module({
  controllers: [ActivityResourceController],
  providers: [ActivityService, ActivityRepository],
  exports: [ActivityService, ActivityRepository],
})
export class ActivityModule {}
