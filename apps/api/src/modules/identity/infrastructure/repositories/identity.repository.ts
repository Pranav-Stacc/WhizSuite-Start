import { Injectable } from '@nestjs/common';
import { Permissions } from '@agency-os/contracts';
import { PrismaService } from '../../../../shared/database/prisma.service';

const MEMBERSHIP_ACTIVE = 'ACTIVE';
const MEMBERSHIP_DEACTIVATED = 'DEACTIVATED';

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
} as const;

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

  findProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
  }

  updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string | null;
      jobTitle?: string | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });
  }

  findPrimaryMembership(userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
  }

  findMembershipById(membershipId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, status: 'ACTIVE' },
    });
  }

  findActiveMembershipForUser(organizationId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { organizationId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
  }

  findMembershipOfUser(organizationId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { organizationId, userId, status: MEMBERSHIP_ACTIVE },
      select: { id: true, type: true },
    });
  }

  /** Switches the membership type and replaces its role assignments with the given organisation-wide role. */
  changeMembershipType(
    organizationId: string,
    membershipId: string,
    type: string,
    roleId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.roleAssignment.deleteMany({
        where: { organizationId, membershipId },
      });
      await tx.roleAssignment.create({
        data: {
          organizationId,
          membershipId,
          roleId,
          scopes: { create: [{ organizationId, scopeType: 'ORGANIZATION' }] },
        },
      });
      return tx.organizationMembership.update({
        where: { id: membershipId },
        data: { type },
        select: { id: true, type: true, status: true },
      });
    });
  }

  /** Revokes all access: the membership is kept for history but loses every role. */
  deactivateMembership(organizationId: string, membershipId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.roleAssignment.deleteMany({
        where: { organizationId, membershipId },
      });
      await tx.organizationMembership.update({
        where: { id: membershipId },
        data: { status: MEMBERSHIP_DEACTIVATED },
      });
    });
  }

  findMembershipUsers(
    organizationId: string,
    membershipIds: readonly string[],
  ) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId, id: { in: [...membershipIds] } },
      select: { id: true, userId: true },
    });
  }

  /** The client a CLIENT membership is scoped to, if any. */
  async findClientScope(
    organizationId: string,
    membershipId: string,
  ): Promise<string | undefined> {
    const scope = await this.prisma.roleAssignmentScope.findFirst({
      where: {
        organizationId,
        scopeType: 'CLIENT',
        resourceId: { not: null },
        roleAssignment: { membershipId },
      },
      select: { resourceId: true },
    });
    return scope?.resourceId ?? undefined;
  }

  createUser(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
  }) {
    return this.prisma.user.create({
      data: { ...input, emailVerified: false },
    });
  }

  /** Active memberships of an organisation joined with their user profiles. */
  async listOrganizationMembers(organizationId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberships.map((m) => m.userId) } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        jobTitle: true,
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return memberships.flatMap((membership) => {
      const user = byId.get(membership.userId);
      return user ? [{ membership, user }] : [];
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

  /** Atomically revokes an active session; false when it was already revoked (e.g. a concurrent refresh). */
  async claimSession(id: string): Promise<boolean> {
    const { count } = await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count === 1;
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
            create: [
              { organizationId: organization.id, scopeType: 'ORGANIZATION' },
            ],
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
