import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface ReportCreateRow {
  clientId: string;
  templateId?: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  snapshot?: Record<string, unknown>;
}

export interface ReportUpdateRow {
  title?: string;
  status?: string;
  periodStart?: Date;
  periodEnd?: Date;
  snapshot?: Record<string, unknown>;
}

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number, clientIds?: string[]) {
    return this.prisma.report.findMany({
      where: {
        organizationId,
        ...(clientIds ? { clientId: { in: clientIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.report.findFirst({ where: { id, organizationId } });
  }

  create(organizationId: string, row: ReportCreateRow) {
    return this.prisma.report.create({
      data: { ...row, organizationId, snapshot: toInputJson(row.snapshot) },
    });
  }

  update(organizationId: string, id: string, row: ReportUpdateRow) {
    return this.prisma.report.updateMany({
      where: { id, organizationId },
      data: { ...row, snapshot: toInputJson(row.snapshot) },
    });
  }
}
