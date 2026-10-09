import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { AccessModule } from '../access/access.module';
import { ClientsModule } from '../clients/clients.module';
import { IdentityModule } from '../identity/identity.module';
import { InvitationsService } from './application/services/invitations.service';
import { InvitationsRepository } from './infrastructure/repositories/invitations.repository';
import {
  InvitationsPublicController,
  InvitationsResourceController,
} from './interface/http/controllers/invitations-resource.controller';

@Module({
  imports: [SharedModule, AccessModule, ClientsModule, IdentityModule],
  controllers: [InvitationsResourceController, InvitationsPublicController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService],
})
export class InvitationsModule {}
