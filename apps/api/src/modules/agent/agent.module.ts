import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CapabilitiesModule } from '../capabilities/capabilities.module';
import { AgentOrchestratorService } from './application/services/agent-orchestrator.service';
import { AgentRunService } from './application/services/agent-run.service';
import { AgentSessionService } from './application/services/agent-session.service';
import { AgentRepository } from './infrastructure/repositories/agent.repository';
import { AgentController } from './interface/http/controllers/agent.controller';
import { AGENT_RUN_QUEUE, AgentRunQueue } from './jobs/agent-run.queue';
import { AgentRunProcessor } from './jobs/agent-run.processor';
import { AgentSchedulerService } from './jobs/agent-scheduler.service';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: AGENT_RUN_QUEUE }),
    forwardRef(() => CapabilitiesModule),
  ],
  controllers: [AgentController],
  providers: [
    AgentRepository,
    AgentSessionService,
    AgentRunService,
    AgentOrchestratorService,
    AgentRunQueue,
    AgentRunProcessor,
    AgentSchedulerService,
  ],
  exports: [AgentRepository, AgentSessionService, AgentRunService],
})
export class AgentModule {}
