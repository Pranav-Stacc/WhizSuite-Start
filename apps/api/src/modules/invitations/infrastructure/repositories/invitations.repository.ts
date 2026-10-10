import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
} as const;

export const INVITATION_LINK_STATUS = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

export const PORTAL_ACCESS_MODE = {
  TEMPORARY: 'TEMPORARY',
  PERMANENT: 'PERMANENT',
} as const;

const MEMBERSHIP_ACTIVE = 'ACTIVE';

export interface InvitationScopePayload {
  clientId?: string;
}

const LINK_PUBLIC_FIELDS = {
  id: true,
  membershipType: true,
  scopePayload: true,
  accessMode: true,
  membershipTtlHours: true,
  maxUses: true,
  useCount: true,
  allowedDomains: true,
  status: true,
  expiresAt: true,
  createdAt: true,
} satisfies Prisma.InvitationLinkSelect;

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  membershipType: true,
  scopePayload: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
} satisfies Prisma.InvitationSelect;

export function scopeOf(
  payload: Prisma.JsonValue | null,
): InvitationScopePayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return {};
  const clientId = (payload as Record<string, unknown>).clientId;
  return typeof clientId === 'string' ? { clientId } : {};
}

/** Staff types outrank CLIENT so dual client+member access keeps agency capabilities. */
const MEMBERSHIP_RANK: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  CLIENT: 1,
};

function preferMembershipType(
  current: string | undefined,
  incoming: string,
): string {
  if (!current) return incoming;
  return (MEMBERSHIP_RANK[incoming] ?? 0) >= (MEMBERSHIP_RANK[current] ?? 0)
    ? incoming
    : current;
}

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_FIELDS,
    });
  }

  create(data: {
    organizationId: string;
    email: string;
    tokenHash: string;
    membershipType: string;
    roleIds: string[];
    scope: InvitationScopePayload;
    invitedById: string;
    expiresAt: Date;
  }) {
    const { scope, ...rest } = data;
    return this.prisma.invitation.create({
      data: {
        ...rest,
        scopePayload: scope.clientId ? { clientId: scope.clientId } : undefined,
      },
      select: { ...PUBLIC_FIELDS, organizationId: true },
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.invitation.findFirst({ where: { tokenHash } });
  }

  async getOrganizationName(
    organizationId: string,
  ): Promise<string | undefined> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return org?.name;
  }

  hasActiveMembership(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    return this.prisma.organizationMembership
      .count({
        where: {
          organizationId,
          userId,
          status: MEMBERSHIP_ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      })
      .then((count) => count > 0);
  }

  /** Marks a still-pending invitation as revoked; returns false when nothing was pending. */
  revokePending(organizationId: string, id: string): Promise<boolean> {
    return this.prisma.invitation
      .updateMany({
        where: { id, organizationId, status: INVITATION_STATUS.PENDING },
        data: { status: INVITATION_STATUS.REVOKED },
      })
      .then((result) => result.count > 0);
  }

  acceptInvitation(
    invitation: { id: string; organizationId: string; membershipType: string },
    input: {
      userId: string;
      roleIds: string[];
      clientId?: string;
      expiresAt?: Date | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const membership = await this.upsertMembershipRoles(tx, {
        organizationId: invitation.organizationId,
        membershipType: invitation.membershipType,
        ...input,
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: INVITATION_STATUS.ACCEPTED, acceptedAt: new Date() },
      });
      return membership;
    });
  }

  /** Grants CLIENT (or other) membership from a shareable link — does not touch email invitations. */
  grantMembershipFromLink(input: {
    organizationId: string;
    membershipType: string;
    userId: string;
    roleIds: string[];
    clientId?: string;
    expiresAt?: Date | null;
  }) {
    return this.prisma.$transaction((tx) => this.upsertMembershipRoles(tx, input));
  }

  /**
   * Creates or updates membership for an email-linked user.
   * When the same person is invited as client and as staff, roles/scopes merge so
   * they keep both portal and agency access instead of replacing one with the other.
   */
  private async upsertMembershipRoles(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      membershipType: string;
      userId: string;
      roleIds: string[];
      clientId?: string;
      expiresAt?: Date | null;
    },
  ) {
    const { organizationId } = input;
    const scope = input.clientId
      ? { organizationId, scopeType: 'CLIENT', resourceId: input.clientId }
      : { organizationId, scopeType: 'ORGANIZATION' };
    const expiresAt =
      input.expiresAt === undefined ? undefined : input.expiresAt;

    const existing = await tx.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: input.userId },
      },
      include: {
        roleAssignments: { include: { scopes: true } },
      },
    });

    const nextType = preferMembershipType(
      existing?.type,
      input.membershipType,
    );

    const membership = await tx.organizationMembership.upsert({
      where: {
        organizationId_userId: { organizationId, userId: input.userId },
      },
      create: {
        organizationId,
        userId: input.userId,
        type: nextType,
        status: MEMBERSHIP_ACTIVE,
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      },
      update: {
        type: nextType,
        status: MEMBERSHIP_ACTIVE,
        // Staff memberships are indefinite; only portal temp links set expiry.
        ...(expiresAt !== undefined
          ? { expiresAt: nextType === 'CLIENT' ? expiresAt : null }
          : nextType !== 'CLIENT'
            ? { expiresAt: null }
            : {}),
      },
    });

    const existingRoleIds = new Set(
      (existing?.roleAssignments ?? []).map((row) => row.roleId),
    );

    for (const roleId of input.roleIds) {
      if (existingRoleIds.has(roleId)) {
        // Keep prior assignment; if this invite adds a client scope, attach it.
        if (input.clientId) {
          const assignment = existing?.roleAssignments.find(
            (row) => row.roleId === roleId,
          );
          if (
            assignment &&
            !assignment.scopes.some(
              (s) =>
                s.scopeType === 'CLIENT' && s.resourceId === input.clientId,
            )
          ) {
            await tx.roleAssignmentScope.create({
              data: {
                organizationId,
                roleAssignmentId: assignment.id,
                scopeType: 'CLIENT',
                resourceId: input.clientId,
              },
            });
          }
        }
        continue;
      }
      await tx.roleAssignment.create({
        data: {
          organizationId,
          membershipId: membership.id,
          roleId,
          scopes: { create: [scope] },
        },
      });
    }
    return membership;
  }

  listLinks(organizationId: string) {
    return this.prisma.invitationLink.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: LINK_PUBLIC_FIELDS,
    });
  }

  createLink(data: {
    organizationId: string;
    tokenHash: string;
    membershipType: string;
    roleIds: string[];
    scope: InvitationScopePayload;
    accessMode: string;
    membershipTtlHours: number | null;
    maxUses: number | null;
    allowedDomains: string[];
    createdById: string;
    expiresAt: Date;
  }) {
    const { scope, ...rest } = data;
    return this.prisma.invitationLink.create({
      data: {
        ...rest,
        status: INVITATION_LINK_STATUS.ACTIVE,
        scopePayload: scope.clientId ? { clientId: scope.clientId } : undefined,
      },
      select: { ...LINK_PUBLIC_FIELDS, organizationId: true },
    });
  }

  findLinkByTokenHash(tokenHash: string) {
    return this.prisma.invitationLink.findFirst({ where: { tokenHash } });
  }

  revokeLink(organizationId: string, id: string): Promise<boolean> {
    return this.prisma.invitationLink
      .updateMany({
        where: {
          id,
          organizationId,
          status: INVITATION_LINK_STATUS.ACTIVE,
        },
        data: { status: INVITATION_LINK_STATUS.REVOKED },
      })
      .then((result) => result.count > 0);
  }

  /**
   * Atomically increments useCount when under maxUses (null = unlimited).
   * Returns false when the link is exhausted or missing.
   */
  async consumeLinkUse(id: string, maxUses: number | null): Promise<boolean> {
    if (maxUses == null) {
      const result = await this.prisma.invitationLink.updateMany({
        where: { id, status: INVITATION_LINK_STATUS.ACTIVE },
        data: { useCount: { increment: 1 } },
      });
      return result.count > 0;
    }
    const result = await this.prisma.invitationLink.updateMany({
      where: {
        id,
        status: INVITATION_LINK_STATUS.ACTIVE,
        useCount: { lt: maxUses },
      },
      data: { useCount: { increment: 1 } },
    });
    return result.count > 0;
  }

  clearMembershipExpiry(membershipId: string) {
    return this.prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { expiresAt: null },
      select: { id: true, organizationId: true, expiresAt: true },
    });
  }
}
