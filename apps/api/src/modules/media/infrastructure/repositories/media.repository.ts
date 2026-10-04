import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, limit = 50) {
    return this.prisma.mediaAsset.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findById(organizationId: string, id: string) {
    return this.prisma.mediaAsset.findFirst({
      where: { id, organizationId },
    });
  }

  create(organizationId: string, data: Record<string, unknown>) {
    return this.prisma.mediaAsset.create({
      data: { ...data, organizationId } as never,
    });
  }

  update(organizationId: string, id: string, data: Record<string, unknown>) {
    return this.prisma.mediaAsset.updateMany({
      where: { id, organizationId },
      data: data as never,
    });
  }

  createWithVersion(
    organizationId: string,
    input: {
      name: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      createdById: string;
      status?: string;
    },
  ) {
    return this.prisma.mediaAsset.create({
      data: {
        organizationId,
        name: input.name,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        status: input.status ?? 'PENDING_UPLOAD',
        createdById: input.createdById,
        versions: {
          create: {
            organizationId,
            version: 1,
            storageKey: input.storageKey,
          },
        },
      },
      include: { versions: true },
    });
  }
}
