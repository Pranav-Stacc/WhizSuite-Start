import { Module } from '@nestjs/common';
import { CalendarService } from './application/services/calendar.service';
import { CalendarRepository } from './infrastructure/repositories/calendar.repository';
import { CalendarResourceController } from './interface/http/controllers/calendar-resource.controller';

@Module({
  controllers: [CalendarResourceController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService, CalendarRepository],
})
export class CalendarModule {}
