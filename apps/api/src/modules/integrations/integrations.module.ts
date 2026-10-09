import { Module } from '@nestjs/common';
import { IntegrationsService } from './application/services/integrations.service';
import { IntegrationsRepository } from './infrastructure/repositories/integrations.repository';
import { IntegrationsResourceController } from './interface/http/controllers/integrations-resource.controller';
import { GoogleDriveClient } from './providers/google-drive.client';
import { MetaClient } from './providers/meta.client';

@Module({
  controllers: [IntegrationsResourceController],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    MetaClient,
    GoogleDriveClient,
  ],
  exports: [
    IntegrationsService,
    IntegrationsRepository,
    MetaClient,
    GoogleDriveClient,
  ],
})
export class IntegrationsModule {}
