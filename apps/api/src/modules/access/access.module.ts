import { Module } from '@nestjs/common';
import { AuthorizationService } from './application/services/authorization.service';
import { AccessRepository } from './infrastructure/repositories/access.repository';
import { AccessController } from './interface/http/controllers/access.controller';
import { PermissionsCatalogController, RolesResourceController } from './interface/http/controllers/roles-resource.controller';
import { AccessService } from './application/services/access.service';
import { AccessBootstrapService } from './application/services/access-bootstrap.service';

@Module({
  controllers: [AccessController, RolesResourceController, PermissionsCatalogController],
  providers: [
    AuthorizationService,
    AccessService,
    AccessRepository,
    AccessBootstrapService,
  ],
  exports: [AuthorizationService, AccessRepository],
})
export class AccessModule {}
