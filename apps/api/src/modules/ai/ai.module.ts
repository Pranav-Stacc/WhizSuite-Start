import { Module } from '@nestjs/common';
import { AiService } from './application/services/ai.service';
import { AiRepository } from './infrastructure/repositories/ai.repository';
import { AiController } from './interface/http/controllers/ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiService, AiRepository],
  exports: [AiService],
})
export class AiModule {}
