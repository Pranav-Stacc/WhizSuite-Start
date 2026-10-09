import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { IdentityModule } from '../identity/identity.module';
import { ApprovalsService } from './application/services/approvals.service';
import { ApproverResolutionService } from './application/services/approver-resolution.service';
import { ApprovalsRepository } from './infrastructure/repositories/approvals.repository';
import { ApprovalsResourceController } from './interface/http/controllers/approvals-resource.controller';

@Module({
  imports: [AccessModule, IdentityModule],
  controllers: [ApprovalsResourceController],
  providers: [
    ApprovalsService,
    ApproverResolutionService,
    ApprovalsRepository,
  ],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
