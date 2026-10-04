import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { DomainEventTypes, ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { InvitationsRepository } from '../../infrastructure/repositories/invitations.repository';
import { AuditService } from '../../../audit/application/services/audit.service';
import { EmailService } from '../../../../shared/notifications/email.service';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly repository: InvitationsRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  list(organizationId: string) {
    return this.repository.list(organizationId);
  }

  async invite(
    organizationId: string,
    actorId: string,
    input: {
      email: string;
      membershipType: string;
      roleIds: string[];
      expiresInHours?: number;
    },
  ) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(
      Date.now() + (input.expiresInHours ?? 72) * 3600 * 1000,
    );

    const invitation = await this.repository.create({
      organizationId,
      email: input.email.toLowerCase(),
      tokenHash,
      membershipType: input.membershipType,
      roleIds: input.roleIds,
      invitedById: actorId,
      expiresAt,
    });

    await this.outbox.write({
      type: DomainEventTypes.INVITATION_SENT,
      version: 1,
      organizationId,
      payload: { invitationId: invitation.id, email: invitation.email, token },
      actor: { id: actorId, type: 'user' },
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'invitation.send',
      entityType: 'invitation',
      entityId: invitation.id,
      after: { email: invitation.email },
    });

    const orgName = await this.repository.getOrganizationName(organizationId);
    await this.email.sendInvitation({
      to: invitation.email,
      organizationName: orgName,
      token,
    }).catch(() => undefined);

    return { invitationId: invitation.id, token, expiresAt };
  }

  async accept(token: string, userId: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.repository.findByTokenHash(tokenHash);
    if (!invitation || invitation.status !== 'PENDING') {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Invalid Invitation',
          status: 400,
          code: ErrorCodes.INVITATION_EXPIRED,
        },
        400,
      );
    }
    if (invitation.expiresAt < new Date()) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Invitation Expired',
          status: 400,
          code: ErrorCodes.INVITATION_EXPIRED,
        },
        400,
      );
    }

    const membership = await this.repository.acceptInvitation(invitation, userId);

    await this.outbox.write({
      type: DomainEventTypes.INVITATION_ACCEPTED,
      version: 1,
      organizationId: invitation.organizationId,
      payload: { invitationId: invitation.id, membershipId: membership.id },
      actor: { id: userId, type: 'user' },
    });

    return membership;
  }
}
