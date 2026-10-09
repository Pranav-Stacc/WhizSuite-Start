import { Module } from '@nestjs/common';
import { KnowledgeService } from './application/services/knowledge.service';
import { KnowledgeRepository } from './infrastructure/repositories/knowledge.repository';
import { KnowledgeResourceController } from './interface/http/controllers/knowledge-resource.controller';

@Module({
  controllers: [KnowledgeResourceController],
  providers: [KnowledgeService, KnowledgeRepository],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
