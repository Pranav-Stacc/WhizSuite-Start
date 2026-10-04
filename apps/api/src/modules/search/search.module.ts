import { Module } from '@nestjs/common';
import { SearchService } from './application/services/search.service';
import { SearchRepository } from './infrastructure/repositories/search.repository';
import { SearchController } from './interface/http/controllers/search.controller';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
  exports: [SearchService],
})
export class SearchModule {}
