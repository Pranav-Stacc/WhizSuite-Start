import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class CrmRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.lead.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.lead.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }

  findDefaultPipeline(organizationId: string) {
    return this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }
}
