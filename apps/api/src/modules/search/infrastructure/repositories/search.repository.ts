import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

const EMPTY_RESULTS = {
  clients: [],
  projects: [],
  tasks: [],
  leads: [],
  content: [],
};

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `allowedClientIds` restricts results to those brands; leads are agency-internal and excluded then. */
  async search(
    organizationId: string,
    query: string,
    limit: number,
    allowedClientIds?: string[],
  ) {
    const q = query.trim();
    if (!q) return EMPTY_RESULTS;
    const byClient = allowedClientIds
      ? { clientId: { in: allowedClientIds } }
      : {};

    const [clients, projects, tasks, leads, content] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(allowedClientIds ? { id: { in: allowedClientIds } } : {}),
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
          ...byClient,
          name: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, status: true },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          deletedAt: null,
          ...(allowedClientIds ? { project: byClient } : {}),
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, status: true, projectId: true },
      }),
      allowedClientIds
        ? Promise.resolve([])
        : this.prisma.lead.findMany({
            where: {
              organizationId,
              companyName: { contains: q, mode: 'insensitive' },
            },
            take: limit,
            select: { id: true, companyName: true, stageId: true },
          }),
      this.prisma.contentItem.findMany({
        where: {
          organizationId,
          ...byClient,
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, status: true, clientId: true },
      }),
    ]);

    return { clients, projects, tasks, leads, content };
  }
}
