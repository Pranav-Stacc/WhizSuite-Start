import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { CacheModule } from './cache/cache.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { NotificationsSharedModule } from './notifications/notifications-shared.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { TenantScopeModule } from './tenant/tenant-scope.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    EventsModule,
    StorageModule,
    NotificationsSharedModule,
    QueueModule,
    TenantScopeModule,
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    EventsModule,
    StorageModule,
    NotificationsSharedModule,
    QueueModule,
    TenantScopeModule,
  ],
})
export class SharedModule {}
