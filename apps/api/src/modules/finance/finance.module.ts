import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { ClientsModule } from '../clients/clients.module';
import { FinanceService } from './application/services/finance.service';
import { FinanceRepository } from './infrastructure/repositories/finance.repository';
import { ContractsResourceController } from './interface/http/controllers/contracts-resource.controller';
import { FinanceResourceController } from './interface/http/controllers/finance-resource.controller';

@Module({
  imports: [ClientsModule, StorageModule],
  controllers: [FinanceResourceController, ContractsResourceController],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
