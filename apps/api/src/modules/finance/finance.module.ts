import { Module } from '@nestjs/common';
import { FinanceService } from './application/services/finance.service';
import { FinanceRepository } from './infrastructure/repositories/finance.repository';
import { FinanceResourceController } from './interface/http/controllers/finance-resource.controller';

@Module({
  controllers: [FinanceResourceController],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService, FinanceRepository],
})
export class FinanceModule {}
