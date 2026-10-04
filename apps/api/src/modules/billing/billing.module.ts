import { Module } from '@nestjs/common';
import { BillingService } from './application/services/billing.service';
import { BillingRepository } from './infrastructure/repositories/billing.repository';
import { BillingResourceController } from './interface/http/controllers/billing-resource.controller';

@Module({
  controllers: [BillingResourceController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService, BillingRepository],
})
export class BillingModule {}
