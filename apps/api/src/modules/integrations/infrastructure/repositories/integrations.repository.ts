import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.integrationConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.integrationConnection.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.integrationConnection.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.integrationConnection.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }
}
