import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { WorkService } from './application/services/work.service';
import { WorkRepository } from './infrastructure/repositories/work.repository';
import { WorkResourceController } from './interface/http/controllers/work-resource.controller';
import { TasksController } from './interface/http/controllers/tasks.controller';
import { TaskReminderScheduler } from './jobs/task-reminder.scheduler';

@Module({
  imports: [IdentityModule, ClientsModule, TenancyModule],
  controllers: [WorkResourceController, TasksController],
  providers: [WorkService, WorkRepository, TaskReminderScheduler],
  exports: [WorkService],
})
export class WorkModule {}
