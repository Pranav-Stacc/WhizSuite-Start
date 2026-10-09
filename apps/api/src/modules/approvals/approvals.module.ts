import { Module } from '@nestjs/common';
import { ApprovalsService } from './application/services/approvals.service';
import { ApprovalsRepository } from './infrastructure/repositories/approvals.repository';
import { ApprovalsResourceController } from './interface/http/controllers/approvals-resource.controller';

@Module({
  controllers: [ApprovalsResourceController],
  providers: [ApprovalsService, ApprovalsRepository],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
