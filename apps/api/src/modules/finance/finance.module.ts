import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { FinanceService } from './application/services/finance.service';
import { FinanceRepository } from './infrastructure/repositories/finance.repository';
import { FinanceResourceController } from './interface/http/controllers/finance-resource.controller';

@Module({
  imports: [ClientsModule],
  controllers: [FinanceResourceController],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
