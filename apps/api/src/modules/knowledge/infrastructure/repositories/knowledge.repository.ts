import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

const PAGE_SELECT = {
  id: true,
  title: true,
  content: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  space: { select: { name: true } },
} satisfies Prisma.KbPageSelect;

export type ArticleRecord = Prisma.KbPageGetPayload<{
  select: typeof PAGE_SELECT;
}>;

export interface ArticleRow {
  spaceId?: string;
  title?: string;
  content?: Prisma.InputJsonObject;
}

@Injectable()
export class KnowledgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    spaceNames: readonly string[],
    limit: number,
  ): Promise<ArticleRecord[]> {
    return this.prisma.kbPage.findMany({
      where: { organizationId, space: { name: { in: [...spaceNames] } } },
      select: PAGE_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string): Promise<ArticleRecord | null> {
    return this.prisma.kbPage.findFirst({
      where: { id, organizationId },
      select: PAGE_SELECT,
    });
  }

  /** Spaces act as article categories; one per category name, created on first use. */
  async spaceIdFor(organizationId: string, name: string): Promise<string> {
    const existing = await this.prisma.kbSpace.findFirst({
      where: { organizationId, name },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.kbSpace.create({
      data: { organizationId, name },
      select: { id: true },
    });
    return created.id;
  }

  create(
    organizationId: string,
    row: Required<ArticleRow>,
  ): Promise<ArticleRecord> {
    return this.prisma.kbPage.create({
      data: { ...row, organizationId },
      select: PAGE_SELECT,
    });
  }

  async update(
    organizationId: string,
    id: string,
    row: ArticleRow,
  ): Promise<ArticleRecord> {
    await this.prisma.kbPage.updateMany({
      where: { id, organizationId },
      data: { ...row, version: { increment: 1 } },
    });
    return this.prisma.kbPage.findFirstOrThrow({
      where: { id, organizationId },
      select: PAGE_SELECT,
    });
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.prisma.kbPage.deleteMany({ where: { id, organizationId } });
  }
}
