import { Injectable } from '@nestjs/common';
import type {
  ListMediaAssetsQuery,
  MediaAssetStatus,
  UpdateMediaAssetInput,
} from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';
import type {
  MediaAssetRecord,
  MediaEmbeddingRecord,
  MediaFolderRecord,
} from '../../application/mappers/media-asset.mapper';

const ASSET_SELECT = {
  id: true,
  organizationId: true,
  clientId: true,
  folderId: true,
  projectId: true,
  calendarItemId: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  currentVersion: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  tags: { select: { tag: { select: { name: true } } } },
} as const;

const FOLDER_SELECT = {
  id: true,
  organizationId: true,
  clientId: true,
  projectId: true,
  calendarItemId: true,
  parentId: true,
  name: true,
  path: true,
  visibility: true,
  description: true,
  createdAt: true,
} as const;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    limit: number,
    allowedClientIds?: string[],
    query: ListMediaAssetsQuery = {},
  ): Promise<MediaAssetRecord[]> {
    return this.prisma.mediaAsset.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(allowedClientIds ? { clientId: { in: allowedClientIds } } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.folderId ? { folderId: query.folderId } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.calendarItemId
          ? { calendarItemId: query.calendarItemId }
          : {}),
        ...(query.q
          ? {
              OR: [
                { name: { contains: query.q, mode: 'insensitive' } },
                { searchText: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.tag
          ? {
              tags: {
                some: {
                  tag: { slug: slugify(query.tag) },
                },
              },
            }
          : {}),
        ...(query.clientVisibleOnly
          ? {
              OR: [
                { folderId: null },
                { folder: { visibility: 'CLIENT_VISIBLE' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: ASSET_SELECT,
    });
  }

  findById(
    organizationId: string,
    id: string,
  ): Promise<MediaAssetRecord | null> {
    return this.prisma.mediaAsset.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: ASSET_SELECT,
    });
  }

  findForEmbedding(
    organizationId: string,
    ids: string[],
  ): Promise<MediaEmbeddingRecord[]> {
    return this.prisma.mediaAsset.findMany({
      where: { id: { in: ids }, organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        mimeType: true,
        status: true,
        currentVersion: true,
        versions: { select: { version: true, storageKey: true } },
      },
    });
  }

  async findCurrentStorageKey(
    organizationId: string,
    asset: MediaAssetRecord,
  ): Promise<string | null> {
    const version = await this.prisma.mediaAssetVersion.findFirst({
      where: {
        organizationId,
        assetId: asset.id,
        version: asset.currentVersion,
      },
      select: { storageKey: true },
    });
    return version?.storageKey ?? null;
  }

  async findAllStorageKeys(
    organizationId: string,
    assetId: string,
  ): Promise<string[]> {
    const versions = await this.prisma.mediaAssetVersion.findMany({
      where: { organizationId, assetId },
      select: {
        storageKey: true,
        renditions: { select: { storageKey: true } },
      },
    });
    return versions.flatMap((v) => [
      v.storageKey,
      ...v.renditions.map((r) => r.storageKey),
    ]);
  }

  createWithVersion(
    organizationId: string,
    input: {
      name: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
      createdById: string;
      clientId?: string;
      folderId?: string;
      projectId?: string;
      calendarItemId?: string;
      searchText?: string;
    },
  ): Promise<MediaAssetRecord> {
    return this.prisma.mediaAsset.create({
      data: {
        organizationId,
        name: input.name,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        status: 'PENDING_UPLOAD' satisfies MediaAssetStatus,
        createdById: input.createdById,
        clientId: input.clientId,
        folderId: input.folderId,
        projectId: input.projectId,
        calendarItemId: input.calendarItemId,
        searchText: input.searchText ?? input.name.toLowerCase(),
        versions: {
          create: { organizationId, version: 1, storageKey: input.storageKey },
        },
      },
      select: ASSET_SELECT,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: UpdateMediaAssetInput,
  ): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
  }

  async setStatus(
    organizationId: string,
    id: string,
    status: MediaAssetStatus,
  ): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { status },
    });
  }

  async softDelete(organizationId: string, id: string): Promise<void> {
    await this.prisma.mediaAsset.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  listFolders(
    organizationId: string,
    filters: {
      clientId?: string | null;
      projectId?: string;
      calendarItemId?: string;
      parentId?: string | null;
      clientVisibleOnly?: boolean;
      allowedClientIds?: string[];
    } = {},
  ): Promise<MediaFolderRecord[]> {
    return this.prisma.mediaFolder.findMany({
      where: {
        organizationId,
        ...(filters.clientId !== undefined
          ? { clientId: filters.clientId }
          : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.calendarItemId
          ? { calendarItemId: filters.calendarItemId }
          : {}),
        ...(filters.parentId !== undefined
          ? { parentId: filters.parentId }
          : {}),
        ...(filters.clientVisibleOnly
          ? { visibility: 'CLIENT_VISIBLE' }
          : {}),
        ...(filters.allowedClientIds
          ? {
              OR: [
                { clientId: null },
                { clientId: { in: filters.allowedClientIds } },
              ],
            }
          : {}),
      },
      orderBy: { path: 'asc' },
      select: FOLDER_SELECT,
    });
  }

  findFolder(
    organizationId: string,
    id: string,
  ): Promise<MediaFolderRecord | null> {
    return this.prisma.mediaFolder.findFirst({
      where: { id, organizationId },
      select: FOLDER_SELECT,
    });
  }

  findFolderByPath(
    organizationId: string,
    path: string,
  ): Promise<MediaFolderRecord | null> {
    return this.prisma.mediaFolder.findFirst({
      where: { organizationId, path },
      select: FOLDER_SELECT,
    });
  }

  createFolder(
    organizationId: string,
    input: {
      name: string;
      path: string;
      parentId?: string | null;
      clientId?: string | null;
      projectId?: string | null;
      calendarItemId?: string | null;
      visibility: string;
      description?: string | null;
    },
  ): Promise<MediaFolderRecord> {
    return this.prisma.mediaFolder.create({
      data: {
        organizationId,
        name: input.name,
        path: input.path,
        parentId: input.parentId ?? undefined,
        clientId: input.clientId ?? undefined,
        projectId: input.projectId ?? undefined,
        calendarItemId: input.calendarItemId ?? undefined,
        visibility: input.visibility,
        description: input.description ?? undefined,
      },
      select: FOLDER_SELECT,
    });
  }

  async updateFolder(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      visibility?: string;
      description?: string | null;
    },
  ): Promise<void> {
    await this.prisma.mediaFolder.updateMany({
      where: { id, organizationId },
      data,
    });
  }

  async deleteFolder(organizationId: string, id: string): Promise<boolean> {
    const result = await this.prisma.mediaFolder.deleteMany({
      where: { id, organizationId },
    });
    return result.count > 0;
  }

  async setAssetTags(
    organizationId: string,
    assetId: string,
    tagNames: string[],
  ): Promise<string[]> {
    const unique = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
    const tags = await Promise.all(
      unique.map(async (name) => {
        const slug = slugify(name) || 'tag';
        return this.prisma.mediaTag.upsert({
          where: {
            organizationId_slug: { organizationId, slug },
          },
          create: { organizationId, name, slug },
          update: { name },
          select: { id: true, name: true },
        });
      }),
    );

    await this.prisma.mediaAssetTag.deleteMany({
      where: { organizationId, assetId },
    });
    if (tags.length) {
      await this.prisma.mediaAssetTag.createMany({
        data: tags.map((tag) => ({
          organizationId,
          assetId,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    }

    const searchText = [
      (
        await this.prisma.mediaAsset.findFirst({
          where: { id: assetId },
          select: { name: true },
        })
      )?.name ?? '',
      ...tags.map((t) => t.name),
    ]
      .join(' ')
      .toLowerCase();
    await this.prisma.mediaAsset.updateMany({
      where: { id: assetId, organizationId },
      data: { searchText },
    });

    return tags.map((t) => t.name);
  }

  async recordUsage(input: {
    organizationId: string;
    assetId: string;
    subjectType: string;
    subjectId: string;
  }): Promise<void> {
    await this.prisma.mediaUsageRef.upsert({
      where: {
        assetId_subjectType_subjectId: {
          assetId: input.assetId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
        },
      },
      create: input,
      update: {},
    });
  }
}
