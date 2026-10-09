import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

export interface CustomFieldCreateRow {
  entityType: string;
  key: string;
  label: string;
  type: string;
  options?: string[];
  isRequired?: boolean;
  isFilterable?: boolean;
  clientVisible?: boolean;
}

export type CustomFieldUpdateRow = Partial<
  Omit<CustomFieldCreateRow, 'entityType' | 'key' | 'type'>
>;

@Injectable()
export class CustomizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit: number) {
    return this.prisma.customFieldDefinition.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.customFieldDefinition.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, row: CustomFieldCreateRow) {
    return this.prisma.customFieldDefinition.create({
      data: { ...row, organizationId, options: toInputJson(row.options) },
    });
  }

  update(organizationId: string, id: string, row: CustomFieldUpdateRow) {
    return this.prisma.customFieldDefinition.updateMany({
      where: { id, organizationId },
      data: { ...row, options: toInputJson(row.options) },
    });
  }
}
