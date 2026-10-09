import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, query: string, limit = 20) {
    const q = query.trim();
    if (!q)
      return { clients: [], projects: [], tasks: [], leads: [], content: [] };

    const [clients, projects, tasks, leads, content] = await Promise.all([
      this.prisma.client.findMany({
        where: {
          organizationId,
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
          name: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, status: true },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, status: true, projectId: true },
      }),
      this.prisma.lead.findMany({
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
          title: { contains: q, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, title: true, status: true, clientId: true },
      }),
    ]);

    return { clients, projects, tasks, leads, content };
  }
}
