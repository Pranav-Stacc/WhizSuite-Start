import { Module } from '@nestjs/common';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationsRepository } from './infrastructure/repositories/notifications.repository';
import { NotificationsResourceController } from './interface/http/controllers/notifications-resource.controller';

@Module({
  controllers: [NotificationsResourceController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
