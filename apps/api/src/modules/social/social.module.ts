import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { MetaOauthService } from './application/services/meta-oauth.service';
import { ContentApprovalOrchestratorService } from './application/services/content-approval-orchestrator.service';
import { SocialService } from './application/services/social.service';
import { SocialRepository } from './infrastructure/repositories/social.repository';
import { MetaConnectController } from './interface/http/controllers/meta-connect.controller';
import { MetaOauthController } from './interface/http/controllers/meta-oauth.controller';
import { SocialResourceController } from './interface/http/controllers/social-resource.controller';
import { PublishWorkerService } from './jobs/publish-worker.service';

@Module({
  imports: [
    MediaModule,
    IntegrationsModule,
    IdentityModule,
    ApprovalsModule,
    WorkflowEngineModule,
  ],
  controllers: [
    SocialResourceController,
    MetaConnectController,
    MetaOauthController,
  ],
  providers: [
    SocialService,
    ContentApprovalOrchestratorService,
    SocialRepository,
    PublishWorkerService,
    MetaOauthService,
  ],
  exports: [SocialService],
})
export class SocialModule {}
