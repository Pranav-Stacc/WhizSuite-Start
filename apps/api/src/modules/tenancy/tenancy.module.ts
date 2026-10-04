import { Module } from '@nestjs/common';
import { TenancyService } from './application/services/tenancy.service';
import { TenancyRepository } from './infrastructure/repositories/tenancy.repository';
import { OrganizationsController } from './interface/http/controllers/organizations.controller';
import { DepartmentsController } from './interface/http/controllers/departments.controller';
import { TeamsController } from './interface/http/controllers/teams.controller';

@Module({
  controllers: [
    OrganizationsController,
    DepartmentsController,
    TeamsController,
  ],
  providers: [TenancyService, TenancyRepository],
  exports: [TenancyService, TenancyRepository],
})
export class TenancyModule {}
