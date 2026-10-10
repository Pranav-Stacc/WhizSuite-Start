import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkModule } from '../work/work.module';
import { AutomationExecutionService } from './application/services/automation-execution.service';
import { AutomationService } from './application/services/automation.service';
import { AutomationRepository } from './infrastructure/repositories/automation.repository';
import { AutomationResourceController } from './interface/http/controllers/automation-resource.controller';
import {
  AUTOMATION_EXECUTION_QUEUE,
  AutomationExecutionQueue,
} from './jobs/automation-execution.queue';
import { AutomationExecutionProcessor } from './jobs/automation-execution.processor';

@Module({
  imports: [
    WorkModule,
    IdentityModule,
    forwardRef(() => CapabilitiesModule),
    BullModule.registerQueue({ name: AUTOMATION_EXECUTION_QUEUE }),
  ],
  controllers: [AutomationResourceController],
  providers: [
    AutomationService,
    AutomationRepository,
    AutomationExecutionService,
    AutomationExecutionQueue,
    AutomationExecutionProcessor,
  ],
  exports: [
    AutomationService,
    AutomationRepository,
    AutomationExecutionService,
  ],
})
export class AutomationModule {}
