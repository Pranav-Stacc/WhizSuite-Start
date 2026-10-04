import { Module } from '@nestjs/common';
import { TemplatesService } from './application/services/templates.service';
import { TemplatesRepository } from './infrastructure/repositories/templates.repository';
import { TemplatesResourceController } from './interface/http/controllers/templates-resource.controller';

@Module({
  controllers: [TemplatesResourceController],
  providers: [TemplatesService, TemplatesRepository],
  exports: [TemplatesService, TemplatesRepository],
})
export class TemplatesModule {}
