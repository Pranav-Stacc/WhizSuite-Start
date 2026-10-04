import { Module } from '@nestjs/common';
import { CustomizationService } from './application/services/customization.service';
import { CustomizationRepository } from './infrastructure/repositories/customization.repository';
import { CustomizationResourceController } from './interface/http/controllers/customization-resource.controller';

@Module({
  controllers: [CustomizationResourceController],
  providers: [CustomizationService, CustomizationRepository],
  exports: [CustomizationService, CustomizationRepository],
})
export class CustomizationModule {}
