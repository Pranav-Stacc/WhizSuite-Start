import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../../shared/config/app.config';
import { SubjectScopeService } from '../../../../shared/tenant/subject-scope.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { ActivityRepository } from '../../infrastructure/repositories/activity.repository';
import type { CreateActivityDto } from '../../interface/http/dto/activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    private readonly repository: ActivityRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly subjectScope: SubjectScopeService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.repository.list(
      organizationId,
      this.config.get('RESOURCE_LIST_LIMIT', { infer: true }),
    );
    return this.subjectScope.filterEntities(organizationId, rows);
  }

  async create(
    organizationId: string,
    actorId: string,
    input: CreateActivityDto,
  ) {
    const item = await this.repository.create(organizationId, {
      ...input,
      actorId,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'activity.create',
      entityType: 'activityEvent',
      entityId: item.id,
      after: {
        verb: item.verb,
        entityType: item.entityType,
        entityId: item.entityId,
      },
    });
    return item;
  }
}
