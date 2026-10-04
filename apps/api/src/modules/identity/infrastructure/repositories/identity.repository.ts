import { Injectable } from '@nestjs/common';
import { Permissions } from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
      },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  findPrimaryMembership(userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  createSession(data: {
    userId: string;
    refreshTokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prisma.session.create({ data });
  }

  findSessionById(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  findActiveSessionsForUser(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  revokeSession(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeFamilySessions(familyId: string) {
    return this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  rotateSession(
    id: string,
    data: { refreshTokenHash: string; expiresAt: Date },
  ) {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  async createOrganizationWithOwner(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
    organizationName: string;
    organizationSlug: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          emailVerified: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug,
          status: 'TRIAL',
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: 'Default',
          slug: 'default',
          isDefault: true,
        },
      });

      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          type: 'OWNER',
          status: 'ACTIVE',
        },
      });

      await tx.organizationBranding.create({
        data: { organizationId: organization.id },
      });

      const perms = await tx.permission.findMany({
        where: { key: { in: Object.values(Permissions) } },
      });
      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: 'Owner',
          isSystem: true,
          permissions: {
            create: perms.map((p) => ({
              permissionId: p.id,
              effect: 'ALLOW',
            })),
          },
        },
      });
      await tx.roleAssignment.create({
        data: {
          organizationId: organization.id,
          membershipId: membership.id,
          roleId: ownerRole.id,
          scopes: {
            create: [{ organizationId: organization.id, scopeType: 'ORGANIZATION' }],
          },
        },
      });

      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: 'Default Sales Pipeline',
          isDefault: true,
        },
      });
      const stageNames = ['New', 'Qualified', 'Proposal', 'Won'];
      await tx.pipelineStage.createMany({
        data: stageNames.map((name, order) => ({
          organizationId: organization.id,
          pipelineId: pipeline.id,
          name,
          order,
        })),
      });

      return { user, organization, workspace, membership };
    });
  }
}
