import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SharedModule } from '../../shared/shared.module';
import { BillingModule } from '../billing/billing.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaFoldersService } from './application/services/media-folders.service';
import { MediaService } from './application/services/media.service';
import { MediaStorageService } from './application/services/media-storage.service';
import { MediaExportService } from './application/services/media-export.service';
import { MediaDataSourcesService } from './application/services/media-data-sources.service';
import { MediaRepository } from './infrastructure/repositories/media.repository';
import { MediaFoldersController } from './interface/http/controllers/media-folders.controller';
import { MediaResourceController } from './interface/http/controllers/media-resource.controller';
import { MediaStorageController } from './interface/http/controllers/media-storage.controller';
import { GoogleDriveOauthController } from './interface/http/controllers/google-drive-oauth.controller';
import { MEDIA_EXPORT_QUEUE } from './jobs/media-export.queue';
import { MediaExportProcessor } from './jobs/media-export.processor';

@Module({
  imports: [
    SharedModule,
    BillingModule,
    IntegrationsModule,
    BullModule.registerQueue({ name: MEDIA_EXPORT_QUEUE }),
  ],
  controllers: [
    MediaResourceController,
    MediaFoldersController,
    MediaStorageController,
    GoogleDriveOauthController,
  ],
  providers: [
    MediaService,
    MediaFoldersService,
    MediaStorageService,
    MediaExportService,
    MediaDataSourcesService,
    MediaRepository,
    MediaExportProcessor,
  ],
  exports: [MediaService, MediaFoldersService, MediaStorageService],
})
export class MediaModule {}
