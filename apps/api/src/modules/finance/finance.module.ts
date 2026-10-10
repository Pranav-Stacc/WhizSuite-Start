import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { ClientsModule } from '../clients/clients.module';
import { IdentityModule } from '../identity/identity.module';
import { FinanceService } from './application/services/finance.service';
import { FinanceRepository } from './infrastructure/repositories/finance.repository';
import { ContractsResourceController } from './interface/http/controllers/contracts-resource.controller';
import { FinanceResourceController } from './interface/http/controllers/finance-resource.controller';
import { InvoiceReminderScheduler } from './jobs/invoice-reminder.scheduler';

@Module({
  imports: [ClientsModule, StorageModule, IdentityModule],
  controllers: [FinanceResourceController, ContractsResourceController],
  providers: [FinanceService, FinanceRepository, InvoiceReminderScheduler],
  exports: [FinanceService],
})
export class FinanceModule {}
