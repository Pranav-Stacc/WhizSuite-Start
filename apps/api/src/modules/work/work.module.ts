import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { WorkService } from './application/services/work.service';
import { WorkRepository } from './infrastructure/repositories/work.repository';
import { WorkResourceController } from './interface/http/controllers/work-resource.controller';
import { TasksController } from './interface/http/controllers/tasks.controller';

@Module({
  imports: [IdentityModule],
  controllers: [WorkResourceController, TasksController],
  providers: [WorkService, WorkRepository],
  exports: [WorkService, WorkRepository],
})
export class WorkModule {}
