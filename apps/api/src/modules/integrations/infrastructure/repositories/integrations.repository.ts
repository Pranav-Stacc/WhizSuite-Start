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

  findProviderByKey(key: string) {
    return this.prisma.integrationProvider.findUnique({ where: { key } });
  }

  findByProviderKey(organizationId: string, providerKey: string) {
    return this.prisma.integrationConnection.findFirst({
      where: {
        organizationId,
        provider: { key: providerKey },
      },
      orderBy: { createdAt: 'desc' },
      include: { provider: true },
    });
  }

  findByProviderKeyAndClient(
    organizationId: string,
    providerKey: string,
    clientId: string,
  ) {
    return this.prisma.integrationConnection.findFirst({
      where: {
        organizationId,
        clientId,
        provider: { key: providerKey },
      },
      orderBy: { createdAt: 'desc' },
      include: { provider: true },
    });
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

  async upsertCredential(
    organizationId: string,
    connectionId: string,
    encryptedData: string,
    expiresAt: Date | null,
  ) {
    return this.prisma.integrationCredential.upsert({
      where: { connectionId },
      create: { organizationId, connectionId, encryptedData, expiresAt },
      update: { encryptedData, expiresAt },
    });
  }

  async deleteCredential(connectionId: string): Promise<void> {
    await this.prisma.integrationCredential.deleteMany({
      where: { connectionId },
    });
  }

  async findCredential(
    connectionId: string,
  ): Promise<{ accessToken: string; refreshToken: string | null } | null> {
    const row = await this.prisma.integrationCredential.findUnique({
      where: { connectionId },
    });
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.encryptedData) as {
        accessToken?: string;
        refreshToken?: string | null;
      };
      if (!parsed.accessToken) return null;
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken ?? null,
      };
    } catch {
      return null;
    }
  }

  /** Meta Login for Business credential payload used for Instagram Graph publish. */
  async findMetaPublishCredential(connectionId: string): Promise<{
    pageAccessToken: string;
    pageId: string | null;
    instagramBusinessAccountId: string | null;
  } | null> {
    const row = await this.prisma.integrationCredential.findUnique({
      where: { connectionId },
    });
    if (!row) return null;
    try {
      const parsed = JSON.parse(row.encryptedData) as {
        pageAccessToken?: string;
        accessToken?: string;
        userAccessToken?: string;
        pageId?: string | null;
        instagramBusinessAccountId?: string | null;
      };
      const pageAccessToken =
        parsed.pageAccessToken ??
        parsed.accessToken ??
        parsed.userAccessToken ??
        null;
      if (!pageAccessToken) return null;
      return {
        pageAccessToken,
        pageId: parsed.pageId ?? null,
        instagramBusinessAccountId: parsed.instagramBusinessAccountId ?? null,
      };
    } catch {
      return null;
    }
  }
}
