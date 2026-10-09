import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { AnalyticsRepository } from '../../infrastructure/repositories/analytics.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import type {
  CreateMetricSnapshotDto,
  ListMetricSnapshotsQuery,
} from '../../interface/http/dto/metric-snapshot.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async list(organizationId: string, query: ListMetricSnapshotsQuery) {
    const rows = await this.repository.list(organizationId, {
      from: query.from ? new Date(query.from) : undefined,
      metricKeys: query.metrics,
      limit: this.config.get('METRIC_SNAPSHOT_LIST_LIMIT', { infer: true }),
    });
    return rows.map((row) => ({ ...row, value: row.value.toNumber() }));
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateMetricSnapshotDto,
  ) {
    const item = await this.repository.create(organizationId, {
      metricKey: input.metricKey,
      channelId: input.channelId,
      contentVariantId: input.contentVariantId,
      value: input.value,
      recordedAt: new Date(input.recordedAt),
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'analytics/metrics.create',
      entityType: 'metricSnapshot',
      entityId: (item as { id: string }).id,
      after: {
        metricKey: input.metricKey,
        channelId: input.channelId,
        value: input.value,
        recordedAt: input.recordedAt,
      },
    });
    return item;
  }
}
