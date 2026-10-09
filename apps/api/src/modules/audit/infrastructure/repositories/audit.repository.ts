import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    organizationId: string,
    options: { cursor?: string; limit: number },
  ) {
    const items = await this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: options.limit + 1,
      ...(options.cursor
        ? { cursor: { id: options.cursor }, skip: 1 }
        : {}),
    });
    const hasMore = items.length > options.limit;
    const page = hasMore ? items.slice(0, options.limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    };
  }
}
