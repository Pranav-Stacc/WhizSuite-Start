import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { NotificationsSharedModule } from './notifications/notifications-shared.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    EventsModule,
    StorageModule,
    NotificationsSharedModule,
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    EventsModule,
    StorageModule,
    NotificationsSharedModule,
  ],
})
export class SharedModule {}
