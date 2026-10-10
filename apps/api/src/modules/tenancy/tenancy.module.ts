import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { TenancyService } from './application/services/tenancy.service';
import { TenancyRepository } from './infrastructure/repositories/tenancy.repository';
import { OrganizationsController } from './interface/http/controllers/organizations.controller';
import { DepartmentsController } from './interface/http/controllers/departments.controller';
import { DesignationsController } from './interface/http/controllers/designations.controller';
import { TeamsController } from './interface/http/controllers/teams.controller';

@Module({
  imports: [AccessModule],
  controllers: [
    OrganizationsController,
    DepartmentsController,
    DesignationsController,
    TeamsController,
  ],
  providers: [TenancyService, TenancyRepository],
  exports: [TenancyService, TenancyRepository],
})
export class TenancyModule {}
