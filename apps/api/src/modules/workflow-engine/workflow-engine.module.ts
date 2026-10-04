import { Module } from '@nestjs/common';
import { WorkflowEngineService } from './application/services/workflow-engine.service';
import { WorkflowEngineRepository } from './infrastructure/repositories/workflow-engine.repository';
import { WorkflowEngineResourceController } from './interface/http/controllers/workflow-engine-resource.controller';

@Module({
  controllers: [WorkflowEngineResourceController],
  providers: [WorkflowEngineService, WorkflowEngineRepository],
  exports: [WorkflowEngineService, WorkflowEngineRepository],
})
export class WorkflowEngineModule {}
