import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';

export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
} as const;

const MEMBERSHIP_ACTIVE = 'ACTIVE';

export interface InvitationScopePayload {
  clientId?: string;
}

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
      .count({ where: { organizationId, userId, status: MEMBERSHIP_ACTIVE } })
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
    input: { userId: string; roleIds: string[]; clientId?: string },
  ) {
    const { organizationId } = invitation;
    const scope = input.clientId
      ? { organizationId, scopeType: 'CLIENT', resourceId: input.clientId }
      : { organizationId, scopeType: 'ORGANIZATION' };

    return this.prisma.$transaction(async (tx) => {
      // A previously deactivated member is re-activated rather than duplicated.
      const membership = await tx.organizationMembership.upsert({
        where: {
          organizationId_userId: { organizationId, userId: input.userId },
        },
        create: {
          organizationId,
          userId: input.userId,
          type: invitation.membershipType,
          status: MEMBERSHIP_ACTIVE,
        },
        update: { type: invitation.membershipType, status: MEMBERSHIP_ACTIVE },
      });
      await tx.roleAssignment.deleteMany({
        where: { organizationId, membershipId: membership.id },
      });

      for (const roleId of input.roleIds) {
        await tx.roleAssignment.create({
          data: {
            organizationId,
            membershipId: membership.id,
            roleId,
            scopes: { create: [scope] },
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: INVITATION_STATUS.ACCEPTED, acceptedAt: new Date() },
      });

      return membership;
    });
  }
}
