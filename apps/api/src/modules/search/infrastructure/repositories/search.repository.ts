import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  taskListWhere,
  type StaffTaskScope,
} from '../../../../shared/tenant/scope-filters';

const EMPTY_RESULTS = {
  clients: [],
  projects: [],
  tasks: [],
  leads: [],
  content: [],
};

export interface SearchScope {
  clientIds?: string[];
  projectIds?: string[];
  contentIds?: string[];
  taskScope?: StaffTaskScope;
  includeLeads?: boolean;
}

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    organizationId: string,
    query: string,
    limit: number,
    scope: SearchScope = {},
  ) {
    const q = query.trim();
    if (!q) return EMPTY_RESULTS;
    const { clientIds, projectIds, contentIds, taskScope, includeLeads } =
      scope;
    const byClient = clientIds?.length
      ? { clientId: { in: clientIds } }
      : clientIds
        ? { clientId: { in: [] } }
        : {};

    const taskBase: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
      title: { contains: q, mode: 'insensitive' },
    };

    const [clients, projects, tasks, leads, content] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(clientIds ? { id: { in: clientIds } } : {}),
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { legalName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: { id: true, displayName: true, status: true },
      }),
      this.prisma.project.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...byClient,
          ...(projectIds?.length ? { id: { in: projectIds } } : {}),
          name: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, status: true },
      }),
      this.prisma.task.findMany({
        where: taskScope
          ? taskListWhere(taskBase, taskScope)
          : {
              ...taskBase,
              ...(clientIds?.length
                ? {
                    OR: [
                      { clientId: { in: clientIds } },
                      {
                        project: {
                          clientId: { in: clientIds },
                          deletedAt: null,
                        },
                      },
                    ],
                  }
                : {}),
              ...(projectIds?.length ? { projectId: { in: projectIds } } : {}),
            },
        take: limit,
        select: { id: true, title: true, status: true, projectId: true },
      }),
      includeLeads
        ? this.prisma.lead.findMany({
            where: {
              organizationId,
              companyName: { contains: q, mode: 'insensitive' },
            },
            take: limit,
            select: { id: true, companyName: true, stageId: true },
          })
        : Promise.resolve([]),
      this.prisma.contentItem.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...byClient,
          ...(projectIds?.length ? { projectId: { in: projectIds } } : {}),
          ...(contentIds?.length ? { id: { in: contentIds } } : {}),
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, status: true, clientId: true },
      }),
    ]);

    return { clients, projects, tasks, leads, content };
  }
}
