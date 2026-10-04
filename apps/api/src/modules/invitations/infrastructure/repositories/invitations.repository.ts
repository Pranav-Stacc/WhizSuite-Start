import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    organizationId: string;
    email: string;
    tokenHash: string;
    membershipType: string;
    roleIds: string[];
    invitedById: string;
    expiresAt: Date;
  }) {
    return this.prisma.invitation.create({ data });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.invitation.findFirst({ where: { tokenHash } });
  }

  getOrganizationName(organizationId: string) {
    return this.prisma.organization
      .findUnique({ where: { id: organizationId }, select: { name: true } })
      .then((org) => org?.name ?? 'Agency');
  }

  async acceptInvitation(
    invitation: { id: string; organizationId: string; email: string; membershipType: string; roleIds: string[] },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.organizationMembership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          type: invitation.membershipType,
          status: 'ACTIVE',
        },
      });

      for (const roleId of invitation.roleIds) {
        await tx.roleAssignment.create({
          data: {
            organizationId: invitation.organizationId,
            membershipId: membership.id,
            roleId,
            scopes: {
              create: [
                {
                  organizationId: invitation.organizationId,
                  scopeType: 'ORGANIZATION',
                },
              ],
            },
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return membership;
    });
  }
}
