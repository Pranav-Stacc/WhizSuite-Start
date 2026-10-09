import { Module } from '@nestjs/common';
import { CrmService } from './application/services/crm.service';
import { CrmRepository } from './infrastructure/repositories/crm.repository';
import { CrmResourceController } from './interface/http/controllers/crm-resource.controller';

@Module({
  controllers: [CrmResourceController],
  providers: [CrmService, CrmRepository],
  exports: [CrmService],
})
export class CrmModule {}
