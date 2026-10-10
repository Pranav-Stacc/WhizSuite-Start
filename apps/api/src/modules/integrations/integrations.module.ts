import { Module } from '@nestjs/common';
import { IntegrationsService } from './application/services/integrations.service';
import { IntegrationsRepository } from './infrastructure/repositories/integrations.repository';
import { IntegrationsResourceController } from './interface/http/controllers/integrations-resource.controller';
import { GoogleCalendarClient } from './providers/google-calendar.client';
import { GoogleDriveClient } from './providers/google-drive.client';
import { MetaClient } from './providers/meta.client';

@Module({
  controllers: [IntegrationsResourceController],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    MetaClient,
    GoogleDriveClient,
    GoogleCalendarClient,
  ],
  exports: [
    IntegrationsService,
    IntegrationsRepository,
    MetaClient,
    GoogleDriveClient,
    GoogleCalendarClient,
  ],
})
export class IntegrationsModule {}
