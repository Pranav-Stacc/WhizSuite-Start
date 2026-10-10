import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CalendarSourceTypes,
  type CalendarFeedItem,
  type CalendarSourceType,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { ApprovalsService } from '../../../approvals/application/services/approvals.service';
import { FinanceService } from '../../../finance/application/services/finance.service';
import { SocialService } from '../../../social/application/services/social.service';
import { WorkService } from '../../../work/application/services/work.service';
import { CalendarRepository } from '../../infrastructure/repositories/calendar.repository';

const PAID_INVOICE = 'PAID';
const VOID_INVOICE = 'VOID';

const DEFAULT_TYPES = new Set<CalendarSourceType>(CalendarSourceTypes);

export interface CalendarFeedQuery {
  from?: string;
  to?: string;
  clientId?: string;
  types?: CalendarSourceType[];
}

function inClientFilter(
  clientId: string | null | undefined,
  scope: string[] | undefined,
  filterClientId?: string,
): boolean {
  if (filterClientId) return clientId === filterClientId;
  if (!scope) return true;
  return !!clientId && scope.includes(clientId);
}

function dayStart(isoDateKey: string): string {
  return `${isoDateKey.slice(0, 10)}T00:00:00.000Z`;
}

@Injectable()
export class CalendarFeedService {
  private readonly logger = new Logger(CalendarFeedService.name);

  constructor(
    private readonly repository: CalendarRepository,
    private readonly work: WorkService,
    private readonly social: SocialService,
    private readonly approvals: ApprovalsService,
    private readonly finance: FinanceService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async feed(
    organizationId: string,
    query: CalendarFeedQuery,
  ): Promise<CalendarFeedItem[]> {
    const limit = this.config.get('RESOURCE_LIST_LIMIT', { infer: true });
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const range =
      from && to && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())
        ? { from, to }
        : undefined;

    const tenantScope = TenantContext.clientScope();
    if (query.clientId && !TenantContext.canAccessClient(query.clientId)) {
      return [];
    }
    const clientIds = query.clientId ? [query.clientId] : tenantScope;

    const wanted = query.types?.length ? new Set(query.types) : DEFAULT_TYPES;

    const layers = await Promise.all([
      wanted.has('MANUAL') ||
      wanted.has('MEETING') ||
      wanted.has('DEADLINE') ||
      wanted.has('SHOOT')
        ? this.stored(organizationId, limit, clientIds, range, wanted)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('CONTENT')
        ? this.content(organizationId, query.clientId, range)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('TASK') && range
        ? this.tasks(organizationId, range, clientIds)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('MILESTONE') && range
        ? this.milestones(organizationId, range, clientIds)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('APPROVAL') && range
        ? this.pendingApprovals(organizationId, range, clientIds)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('CAMPAIGN')
        ? this.campaigns(organizationId, query.clientId, range, clientIds)
        : Promise.resolve([] as CalendarFeedItem[]),
      wanted.has('INVOICE')
        ? this.invoices(organizationId, range, clientIds)
        : Promise.resolve([] as CalendarFeedItem[]),
    ]);

    return layers
      .flat()
      .filter((item) =>
        inClientFilter(item.clientId, tenantScope, query.clientId),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  private async stored(
    organizationId: string,
    limit: number,
    clientIds: string[] | undefined,
    range: { from: Date; to: Date } | undefined,
    wanted: Set<CalendarSourceType>,
  ): Promise<CalendarFeedItem[]> {
    const rows = await this.repository.list(
      organizationId,
      limit,
      clientIds,
      range,
    );
    return rows
      .filter((row) => wanted.has(row.sourceType as CalendarSourceType))
      .map((row) => ({
        id: `stored:${row.id}`,
        sourceType: row.sourceType as CalendarSourceType,
        sourceId: row.sourceId || row.id,
        title: row.title,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt?.toISOString() ?? null,
        allDay: row.allDay,
        clientId: row.clientId,
        projectId: row.projectId,
        href: null,
        syncToGoogle: row.syncToGoogle,
        externalEventId: row.externalEventId,
        metadata:
          row.metadata && typeof row.metadata === 'object'
            ? (row.metadata as Record<string, unknown>)
            : null,
      }));
  }

  private async content(
    organizationId: string,
    clientId: string | undefined,
    range: { from: Date; to: Date } | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const posts = await this.social.listContent(organizationId, {
        clientId,
        from: range?.from.toISOString(),
        to: range?.to.toISOString(),
      });
      return posts
        .filter((post) => post.scheduledAt)
        .map((post) => ({
          id: `content:${post.id}`,
          sourceType: 'CONTENT' as const,
          sourceId: post.id,
          title: post.title,
          startsAt: post.scheduledAt as string,
          endsAt: null,
          allDay: false,
          clientId: post.clientId,
          projectId: null,
          status: post.status,
          href: `/content/${post.id}`,
          metadata: { platforms: post.platforms },
        }));
    } catch (error) {
      this.logger.warn({ err: error }, 'calendar feed: content layer skipped');
      return [];
    }
  }

  private async tasks(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds: string[] | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const rows = await this.work.listTasksDueInRange(
        organizationId,
        range,
        clientIds,
      );
      return rows
        .filter((row) => row.dueDate)
        .map((row) => ({
          id: `task:${row.id}`,
          sourceType: 'TASK' as const,
          sourceId: row.id,
          title: row.title,
          startsAt: row.dueDate!.toISOString(),
          endsAt: null,
          allDay: true,
          clientId: row.clientId ?? row.project?.clientId ?? null,
          projectId: row.projectId,
          status: row.status,
          href: `/tasks?edit=${row.id}`,
          metadata: null,
        }));
    } catch (error) {
      this.logger.warn({ err: error }, 'calendar feed: tasks layer skipped');
      return [];
    }
  }

  private async milestones(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds: string[] | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const rows = await this.work.listMilestonesDueInRange(
        organizationId,
        range,
        clientIds,
      );
      return rows
        .filter((row) => row.dueDate)
        .map((row) => ({
          id: `milestone:${row.id}`,
          sourceType: 'MILESTONE' as const,
          sourceId: row.id,
          title: `${row.project.name}: ${row.name}`,
          startsAt: dayStart(row.dueDate!.toISOString()),
          endsAt: null,
          allDay: true,
          clientId: row.project.clientId,
          projectId: row.projectId,
          status: null,
          href: `/projects/${row.projectId}`,
          metadata: null,
        }));
    } catch (error) {
      this.logger.warn(
        { err: error },
        'calendar feed: milestones layer skipped',
      );
      return [];
    }
  }

  private async pendingApprovals(
    organizationId: string,
    range: { from: Date; to: Date },
    clientIds: string[] | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const rows = await this.approvals.listPendingInRange(
        organizationId,
        range,
      );
      // Client-scoped principals only see org-wide pending when unrestricted;
      // without a subject→client map we omit approvals for restricted scopes.
      if (clientIds) return [];
      return rows.map((row) => {
        const at = (row.dueAt ?? row.createdAt).toISOString();
        return {
          id: `approval:${row.id}`,
          sourceType: 'APPROVAL' as const,
          sourceId: row.id,
          title: `Approval · ${row.subjectType}`,
          startsAt: at,
          endsAt: null,
          allDay: !row.dueAt,
          clientId: null,
          projectId: null,
          status: row.status,
          href: `/approvals?id=${row.id}`,
          metadata: {
            subjectType: row.subjectType,
            subjectId: row.subjectId,
          },
        };
      });
    } catch (error) {
      this.logger.warn(
        { err: error },
        'calendar feed: approvals layer skipped',
      );
      return [];
    }
  }

  private async campaigns(
    organizationId: string,
    clientId: string | undefined,
    range: { from: Date; to: Date } | undefined,
    clientIds: string[] | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const rows = await this.social.listCampaigns(organizationId, clientId);
      const items: CalendarFeedItem[] = [];
      for (const row of rows) {
        if (clientIds && !clientIds.includes(row.clientId)) continue;
        const pushEdge = (
          edge: 'start' | 'end',
          at: Date,
          endsAt: Date | null,
        ) => {
          if (
            range &&
            (at.getTime() < range.from.getTime() ||
              at.getTime() >= range.to.getTime())
          ) {
            return;
          }
          items.push({
            id: `campaign-${edge}:${row.id}`,
            sourceType: 'CAMPAIGN',
            sourceId: row.id,
            title: `${row.name} · ${edge === 'start' ? 'starts' : 'ends'}`,
            startsAt: dayStart(at.toISOString()),
            endsAt: endsAt ? dayStart(endsAt.toISOString()) : null,
            allDay: true,
            clientId: row.clientId,
            projectId: row.projectId,
            status: row.status,
            href: `/content?client=${row.clientId}`,
            metadata: { edge },
          });
        };
        if (row.startDate) pushEdge('start', row.startDate, row.endDate);
        if (row.endDate) pushEdge('end', row.endDate, null);
      }
      return items;
    } catch (error) {
      this.logger.warn(
        { err: error },
        'calendar feed: campaigns layer skipped',
      );
      return [];
    }
  }

  private async invoices(
    organizationId: string,
    range: { from: Date; to: Date } | undefined,
    clientIds: string[] | undefined,
  ): Promise<CalendarFeedItem[]> {
    try {
      const rows = await this.finance.list(organizationId);
      return rows
        .filter((row) => {
          if (!row.dueDate) return false;
          if (row.status === PAID_INVOICE || row.status === VOID_INVOICE) {
            return false;
          }
          if (clientIds && !clientIds.includes(row.clientId)) return false;
          if (!range) return true;
          const at = new Date(row.dueDate).getTime();
          return at >= range.from.getTime() && at < range.to.getTime();
        })
        .map((row) => ({
          id: `invoice:${row.id}`,
          sourceType: 'INVOICE' as const,
          sourceId: row.id,
          title: `Invoice ${row.number} due`,
          startsAt: row.dueDate as string,
          endsAt: null,
          allDay: true,
          clientId: row.clientId,
          projectId: null,
          status: row.status,
          href: `/invoices?id=${row.id}`,
          metadata: { totalMinor: row.totalMinor, currency: row.currency },
        }));
    } catch (error) {
      this.logger.warn({ err: error }, 'calendar feed: invoices layer skipped');
      return [];
    }
  }
}
