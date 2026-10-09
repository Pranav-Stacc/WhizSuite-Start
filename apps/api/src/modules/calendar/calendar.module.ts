import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { FinanceModule } from '../finance/finance.module';
import { MediaModule } from '../media/media.module';
import { SocialModule } from '../social/social.module';
import { WorkModule } from '../work/work.module';
import { CalendarFeedService } from './application/services/calendar-feed.service';
import { CalendarService } from './application/services/calendar.service';
import { ShootService } from './application/services/shoot.service';
import { CalendarRepository } from './infrastructure/repositories/calendar.repository';
import {
  CalendarFeedController,
  CalendarResourceController,
  CalendarShootsController,
} from './interface/http/controllers/calendar-resource.controller';

@Module({
  imports: [MediaModule, WorkModule, SocialModule, ApprovalsModule, FinanceModule],
  controllers: [
    CalendarFeedController,
    CalendarResourceController,
    CalendarShootsController,
  ],
  providers: [
    CalendarService,
    CalendarFeedService,
    ShootService,
    CalendarRepository,
  ],
  exports: [CalendarService, CalendarFeedService, CalendarRepository],
})
export class CalendarModule {}
