import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.report.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.report.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.report.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }
}
