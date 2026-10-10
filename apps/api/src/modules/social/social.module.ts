import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MediaModule } from '../media/media.module';
import { MetaOauthService } from './application/services/meta-oauth.service';
import { SocialService } from './application/services/social.service';
import { SocialRepository } from './infrastructure/repositories/social.repository';
import { MetaConnectController } from './interface/http/controllers/meta-connect.controller';
import { MetaOauthController } from './interface/http/controllers/meta-oauth.controller';
import { SocialResourceController } from './interface/http/controllers/social-resource.controller';
import { PublishWorkerService } from './jobs/publish-worker.service';

@Module({
  imports: [MediaModule, IntegrationsModule, IdentityModule],
  controllers: [
    SocialResourceController,
    MetaConnectController,
    MetaOauthController,
  ],
  providers: [
    SocialService,
    SocialRepository,
    PublishWorkerService,
    MetaOauthService,
  ],
  exports: [SocialService],
})
export class SocialModule {}
