import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { SearchRepository } from '../../infrastructure/repositories/search.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly repository: SearchRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  search(organizationId: string, query: string) {
    const limit = this.config.get('SEARCH_RESULT_LIMIT', { infer: true });
    const clientIds = TenantContext.clientScope();
    const restricted =
      clientIds !== undefined ||
      TenantContext.projectScope() !== undefined ||
      TenantContext.contentScope() !== undefined ||
      TenantContext.selfOnly();
    return this.repository.search(organizationId, query, limit, {
      clientIds,
      projectIds: TenantContext.projectScope(),
      contentIds: TenantContext.contentScope(),
      taskScope: TenantContext.taskScope(),
      includeLeads: !restricted,
    });
  }
}
