import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface TemplateCreateRow {
  type: string;
  name: string;
  scope?: string;
  definition: Record<string, unknown>;
}

export interface TemplateUpdateRow {
  name?: string;
  scope?: string;
  definition?: Record<string, unknown>;
}

@Injectable()
export class TemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number) {
    return this.prisma.template.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.template.findFirst({ where: { id, organizationId } });
  }

  create(organizationId: string, row: TemplateCreateRow) {
    return this.prisma.template.create({
      data: {
        ...row,
        organizationId,
        definition: toInputJson(row.definition) ?? {},
      },
    });
  }

  update(organizationId: string, id: string, row: TemplateUpdateRow) {
    return this.prisma.template.updateMany({
      where: { id, organizationId },
      data: {
        name: row.name,
        scope: row.scope,
        ...(row.definition
          ? {
              definition: toInputJson(row.definition),
              version: { increment: 1 },
            }
          : {}),
      },
    });
  }
}
