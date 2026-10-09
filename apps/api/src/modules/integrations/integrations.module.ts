import { Module } from '@nestjs/common';
import { IntegrationsService } from './application/services/integrations.service';
import { IntegrationsRepository } from './infrastructure/repositories/integrations.repository';
import { IntegrationsResourceController } from './interface/http/controllers/integrations-resource.controller';
import { MetaClient } from './providers/meta.client';

@Module({
  controllers: [IntegrationsResourceController],
  providers: [IntegrationsService, IntegrationsRepository, MetaClient],
  exports: [IntegrationsService, IntegrationsRepository, MetaClient],
})
export class IntegrationsModule {}
