import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { FinanceModule } from '../finance/finance.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
import { SocialModule } from '../social/social.module';
import { WorkModule } from '../work/work.module';
import { CalendarFeedService } from './application/services/calendar-feed.service';
import { CalendarService } from './application/services/calendar.service';
import { GoogleCalendarSyncService } from './application/services/google-calendar-sync.service';
import { ShootService } from './application/services/shoot.service';
import { CalendarConnectionRepository } from './infrastructure/repositories/calendar-connection.repository';
import { CalendarRepository } from './infrastructure/repositories/calendar.repository';
import {
  CalendarFeedController,
  CalendarResourceController,
  CalendarShootsController,
  GoogleCalendarController,
} from './interface/http/controllers/calendar-resource.controller';
import { GoogleCalendarOauthController } from './interface/http/controllers/google-calendar-oauth.controller';
import { CalendarReminderScheduler } from './jobs/calendar-reminder.scheduler';
import { CalendarSyncProcessor } from './jobs/calendar-sync.processor';
import {
  CALENDAR_SYNC_QUEUE,
  CalendarSyncQueue,
} from './jobs/calendar-sync.queue';

@Module({
  imports: [
    MediaModule,
    WorkModule,
    SocialModule,
    ApprovalsModule,
    FinanceModule,
    IntegrationsModule,
    BullModule.registerQueue({ name: CALENDAR_SYNC_QUEUE }),
  ],
  controllers: [
    CalendarFeedController,
    CalendarResourceController,
    CalendarShootsController,
    GoogleCalendarController,
    GoogleCalendarOauthController,
  ],
  providers: [
    CalendarService,
    CalendarFeedService,
    ShootService,
    GoogleCalendarSyncService,
    CalendarRepository,
    CalendarConnectionRepository,
    CalendarSyncQueue,
    CalendarSyncProcessor,
    CalendarReminderScheduler,
  ],
  exports: [
    CalendarService,
    CalendarFeedService,
    CalendarRepository,
    ShootService,
    GoogleCalendarSyncService,
  ],
})
export class CalendarModule {}
