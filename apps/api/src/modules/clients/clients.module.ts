import { Module } from '@nestjs/common';
import { ClientsService } from './application/services/clients.service';
import { ClientsRepository } from './infrastructure/repositories/clients.repository';
import { ClientContactsController } from './interface/http/controllers/client-contacts.controller';
import { ClientsController } from './interface/http/controllers/clients.controller';

@Module({
  controllers: [ClientsController, ClientContactsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
