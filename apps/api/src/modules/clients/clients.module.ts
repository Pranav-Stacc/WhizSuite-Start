import { Module } from '@nestjs/common';
import { ClientsService } from './application/services/clients.service';
import { ClientsRepository } from './infrastructure/repositories/clients.repository';
import { ClientsController } from './interface/http/controllers/clients.controller';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, ClientsRepository],
  exports: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
