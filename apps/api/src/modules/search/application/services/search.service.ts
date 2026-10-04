import { Injectable } from '@nestjs/common';
import { SearchRepository } from '../../infrastructure/repositories/search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  search(organizationId: string, query: string) {
    return this.repository.search(organizationId, query);
  }
}
