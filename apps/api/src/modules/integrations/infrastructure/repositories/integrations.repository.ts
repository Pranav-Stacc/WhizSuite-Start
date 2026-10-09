import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface ConnectionCreateRow {
  providerId: string;
  clientId?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectionUpdateRow {
  status?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number) {
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

  providerExists(providerId: string): Promise<boolean> {
    return this.prisma.integrationProvider
      .count({ where: { id: providerId } })
      .then((count) => count > 0);
  }

  create(organizationId: string, row: ConnectionCreateRow) {
    return this.prisma.integrationConnection.create({
      data: { ...row, organizationId, metadata: toInputJson(row.metadata) },
    });
  }

  update(organizationId: string, id: string, row: ConnectionUpdateRow) {
    return this.prisma.integrationConnection.updateMany({
      where: { id, organizationId },
      data: { ...row, metadata: toInputJson(row.metadata) },
    });
  }
}
