import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import {
  notFound,
  unprocessable,
} from '../../../../shared/errors/problem-details.exception';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AuditService } from '../../../audit/application/services/audit.service';
import { ReportingRepository } from '../../infrastructure/repositories/reporting.repository';
import type {
  CreateReportDto,
  UpdateReportDto,
} from '../../interface/http/dto/report.dto';

const ENTITY_TYPE = 'report';

function assertPeriod(start: Date, end: Date): void {
  if (end < start)
    throw unprocessable('periodEnd must not be before periodStart');
}

@Injectable()
export class ReportingService {
  constructor(
    private readonly repository: ReportingRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  list(organizationId: string) {
    return this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
      TenantContext.clientScope(),
    );
  }

  async get(organizationId: string, id: string) {
    const item = await this.repository.findById(organizationId, id);
    if (!item || !TenantContext.canAccessClient(item.clientId))
      throw notFound();
    return item;
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateReportDto,
  ) {
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);
    assertPeriod(periodStart, periodEnd);
    const item = await this.repository.create(organizationId, {
      ...input,
      periodStart,
      periodEnd,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'reports.create',
      entityType: ENTITY_TYPE,
      entityId: item.id,
      after: { clientId: item.clientId, title: item.title },
    });
    return item;
  }

  async update(
    organizationId: string,
    actorId: string,
    id: string,
    input: UpdateReportDto,
  ) {
    const before = await this.get(organizationId, id);
    const periodStart = input.periodStart
      ? new Date(input.periodStart)
      : undefined;
    const periodEnd = input.periodEnd ? new Date(input.periodEnd) : undefined;
    assertPeriod(
      periodStart ?? before.periodStart,
      periodEnd ?? before.periodEnd,
    );
    await this.repository.update(organizationId, id, {
      ...input,
      periodStart,
      periodEnd,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'reports.update',
      entityType: ENTITY_TYPE,
      entityId: id,
      before: { title: before.title, status: before.status },
      after: { ...input },
    });
    return this.get(organizationId, id);
  }
}
