import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, workspaceId?: string) {
    return this.prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(workspaceId ? { workspaceId } : {}),
      },
      orderBy: { displayName: 'asc' },
      include: { brandKit: true, retainers: { where: { status: 'ACTIVE' } } },
    });
  }

  findById(organizationId: string, clientId: string) {
    return this.prisma.client.findFirst({
      where: { id: clientId, organizationId, deletedAt: null },
      include: {
        contacts: true,
        brands: true,
        brandKit: true,
        retainers: true,
        assignments: true,
      },
    });
  }

  create(
    organizationId: string,
    input: {
      workspaceId: string;
      displayName: string;
      legalName?: string;
      industry?: string;
      website?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          organizationId,
          workspaceId: input.workspaceId,
          displayName: input.displayName,
          legalName: input.legalName,
          industry: input.industry,
          website: input.website,
          status: 'ONBOARDING',
        },
      });
      await tx.brandKit.create({
        data: { organizationId, clientId: client.id },
      });
      return client;
    });
  }

  upsertBrandKit(
    organizationId: string,
    clientId: string,
    data: Record<string, unknown>,
  ) {
    return this.prisma.brandKit.upsert({
      where: { clientId },
      create: {
        organizationId,
        clientId,
        voiceTone: toInputJson(data.voiceTone),
        colors: toInputJson(data.colors),
        fonts: toInputJson(data.fonts),
        hashtagSets: toInputJson(data.hashtagSets),
        contentPillars: toInputJson(data.contentPillars),
      },
      update: {
        voiceTone: toInputJson(data.voiceTone),
        colors: toInputJson(data.colors),
        fonts: toInputJson(data.fonts),
        hashtagSets: toInputJson(data.hashtagSets),
        contentPillars: toInputJson(data.contentPillars),
        version: { increment: 1 },
      },
    });
  }
}
