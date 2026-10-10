import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SubjectScopeService } from './subject-scope.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [SubjectScopeService],
  exports: [SubjectScopeService],
})
export class TenantScopeModule {}
