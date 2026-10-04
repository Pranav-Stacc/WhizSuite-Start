import { Module } from '@nestjs/common';
import { IntegrationsService } from './application/services/integrations.service';
import { IntegrationsRepository } from './infrastructure/repositories/integrations.repository';
import { IntegrationsResourceController } from './interface/http/controllers/integrations-resource.controller';

@Module({
  controllers: [IntegrationsResourceController],
  providers: [IntegrationsService, IntegrationsRepository],
  exports: [IntegrationsService, IntegrationsRepository],
})
export class IntegrationsModule {}
