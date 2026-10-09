import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './application/services/audit.service';
import { AuditController } from './interface/http/controllers/audit.controller';
import { AuditRepository } from './infrastructure/repositories/audit.repository';
import { AuditInterceptor } from './interface/http/interceptors/audit.interceptor';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditRepository,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService, AuditRepository],
})
export class AuditModule {}
