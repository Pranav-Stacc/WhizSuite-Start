import { Module } from '@nestjs/common';
import { AutomationService } from './application/services/automation.service';
import { AutomationRepository } from './infrastructure/repositories/automation.repository';
import { AutomationResourceController } from './interface/http/controllers/automation-resource.controller';

@Module({
  controllers: [AutomationResourceController],
  providers: [AutomationService, AutomationRepository],
  exports: [AutomationService, AutomationRepository],
})
export class AutomationModule {}
