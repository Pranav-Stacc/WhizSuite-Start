import { Injectable } from '@nestjs/common';
import { DEFAULT_MEMBERSHIP_ROLES } from '@agency-os/contracts';
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
      where: {
        id: membershipId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  findActiveMembershipForUser(organizationId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        userId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, expiresAt: true },
    });
  }

  findMembershipOfUser(organizationId: string, userId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { organizationId, userId, status: MEMBERSHIP_ACTIVE },
      select: { id: true, type: true },
    });
  }

  /** Switches the membership type and its system role; custom roles assigned to the member are kept. */
  changeMembershipType(
    organizationId: string,
    membershipId: string,
    type: string,
    roleId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.roleAssignment.deleteMany({
        where: { organizationId, membershipId, role: { isSystem: true } },
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
    passwordHash: string | null;
    firstName: string;
    lastName?: string;
    emailVerified?: boolean;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        emailVerified: input.emailVerified ?? false,
        avatarUrl: input.avatarUrl,
      },
    });
  }

  findOauthAccount(provider: string, providerUserId: string) {
    return this.prisma.oauthAccount.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId },
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  linkOauthAccount(input: {
    userId: string;
    provider: string;
    providerUserId: string;
  }) {
    return this.prisma.oauthAccount.create({
      data: input,
      select: { id: true, userId: true },
    });
  }

  markEmailVerified(userId: string, avatarUrl?: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  setPasswordHash(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
  }

  findMembershipWithExpiry(membershipId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: { id: membershipId, status: 'ACTIVE' },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        type: true,
        expiresAt: true,
      },
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
    passwordHash: string | null;
    firstName: string;
    lastName?: string;
    organizationName: string;
    organizationSlug: string;
    emailVerified?: boolean;
    avatarUrl?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          emailVerified: input.emailVerified ?? false,
          avatarUrl: input.avatarUrl,
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
        where: { key: { in: [...DEFAULT_MEMBERSHIP_ROLES.OWNER.permissions] } },
      });
      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: DEFAULT_MEMBERSHIP_ROLES.OWNER.name,
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
