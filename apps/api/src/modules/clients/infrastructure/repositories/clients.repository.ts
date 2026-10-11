import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { toInputJson } from '../../../../shared/database/prisma-json.util';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    workspaceId?: string,
    allowedClientIds?: string[],
  ) {
    return this.prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(workspaceId ? { workspaceId } : {}),
        ...(allowedClientIds ? { id: { in: allowedClientIds } } : {}),
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

  update(
    organizationId: string,
    clientId: string,
    data: {
      displayName?: string;
      industry?: string;
      website?: string;
      status?: string;
    },
  ) {
    return this.prisma.client.update({
      where: { id: clientId, organizationId },
      data: {
        ...(data.displayName ? { displayName: data.displayName } : {}),
        ...(data.industry ? { industry: data.industry } : {}),
        ...(data.website !== undefined ? { website: data.website } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
      include: {
        brandKit: true,
        retainers: { where: { status: 'ACTIVE' } },
        contacts: true,
      },
    });
  }

  listContacts(organizationId: string, clientId?: string) {
    return this.prisma.clientContact.findMany({
      where: {
        organizationId,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: [{ clientId: 'asc' }, { firstName: 'asc' }],
      include: { client: { select: { displayName: true } } },
    });
  }

  createContact(
    organizationId: string,
    clientId: string,
    data: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: string;
      isDecisionMaker?: boolean;
    },
  ) {
    return this.prisma.clientContact.create({
      data: {
        organizationId,
        clientId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        isDecisionMaker: data.isDecisionMaker ?? false,
      },
    });
  }

  updateContact(
    organizationId: string,
    contactId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: string;
      isDecisionMaker?: boolean;
    },
  ) {
    return this.prisma.clientContact.updateMany({
      where: { id: contactId, organizationId },
      data,
    });
  }

  deleteContact(organizationId: string, contactId: string) {
    return this.prisma.clientContact.deleteMany({
      where: { id: contactId, organizationId },
    });
  }

  /** Portal users linked to client contact emails (CLIENT membership on that client). */
  async userIdsForContacts(
    organizationId: string,
    contactIds: string[],
  ): Promise<string[]> {
    if (contactIds.length === 0) return [];
    const contacts = await this.prisma.clientContact.findMany({
      where: { organizationId, id: { in: contactIds } },
      select: { email: true, clientId: true },
    });
    const emails = [
      ...new Set(
        contacts
          .map((row) => row.email?.trim().toLowerCase())
          .filter((email): email is string => !!email),
      ),
    ];
    if (emails.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { email: { in: emails, mode: 'insensitive' } },
      select: { id: true, email: true },
    });
    const emailToUser = new Map(
      users.map((user) => [user.email.toLowerCase(), user.id]),
    );
    const userIds = new Set<string>();
    for (const contact of contacts) {
      const email = contact.email?.trim().toLowerCase();
      if (!email) continue;
      const userId = emailToUser.get(email);
      if (!userId) continue;
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          organizationId,
          userId,
          type: 'CLIENT',
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (membership) userIds.add(userId);
    }
    return [...userIds];
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
