import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import {
  DomainEventTypes,
  ErrorCodes,
  type ErrorCode,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { EmailService } from '../../../../shared/notifications/email.service';
import { AuditService } from '../../../audit/application/services/audit.service';
import { DefaultRolesService } from '../../../access/application/services/default-roles.service';
import { RoleAssignmentService } from '../../../access/application/services/role-assignment.service';
import type { InvitableMembershipType } from '../../../access/config/default-roles';
import { ClientsService } from '../../../clients/application/services/clients.service';
import { AuthService } from '../../../identity/application/services/auth.service';
import {
  INVITATION_STATUS,
  InvitationsRepository,
  scopeOf,
} from '../../infrastructure/repositories/invitations.repository';

const TOKEN_BYTES = 32;
const MS_PER_HOUR = 3_600_000;
const CLIENT_MEMBERSHIP: InvitableMembershipType = 'CLIENT';
const INVITE_PATH = '/invite';

type InvitationRecord = NonNullable<
  Awaited<ReturnType<InvitationsRepository['findByTokenHash']>>
>;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function invalid(
  title: string,
  status = 400,
  code: ErrorCode = ErrorCodes.INVITATION_EXPIRED,
) {
  return new ProblemDetailsException(
    { type: 'about:blank', title, status, code },
    status,
  );
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly repository: InvitationsRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly defaultRoles: DefaultRolesService,
    private readonly roleAssignment: RoleAssignmentService,
    private readonly clients: ClientsService,
    private readonly auth: AuthService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.repository.list(organizationId);
    return rows.map(({ scopePayload, ...row }) => ({
      ...row,
      clientId: scopeOf(scopePayload).clientId ?? null,
    }));
  }

  async invite(
    organizationId: string,
    actorId: string,
    input: {
      email: string;
      membershipType: InvitableMembershipType;
      roleIds?: string[];
      clientId?: string;
      expiresInHours?: number;
    },
  ) {
    const clientId =
      input.membershipType === CLIENT_MEMBERSHIP ? input.clientId : undefined;
    if (input.membershipType === CLIENT_MEMBERSHIP) {
      if (!clientId)
        throw invalid(
          'clientId is required for client invitations',
          400,
          ErrorCodes.VALIDATION_FAILED,
        );
      await this.clients.get(organizationId, clientId);
    }
    if (input.roleIds?.length) {
      await this.roleAssignment.requireAssignableRoles(
        organizationId,
        input.roleIds,
      );
    }

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const defaultTtlHours: number = this.config.get('INVITATION_TTL_HOURS');
    const ttlHours = input.expiresInHours ?? defaultTtlHours;
    const expiresAt = new Date(Date.now() + ttlHours * MS_PER_HOUR);

    const invitation = await this.repository.create({
      organizationId,
      email: input.email.toLowerCase(),
      tokenHash: hashToken(token),
      membershipType: input.membershipType,
      roleIds: input.roleIds ?? [],
      scope: { clientId },
      invitedById: actorId,
      expiresAt,
    });

    await this.outbox.write({
      type: DomainEventTypes.INVITATION_SENT,
      version: 1,
      organizationId,
      payload: {
        invitationId: invitation.id,
        email: invitation.email,
        membershipType: input.membershipType,
      },
      actor: { id: actorId, type: 'user' },
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'invitation.send',
      entityType: 'invitation',
      entityId: invitation.id,
      after: {
        email: invitation.email,
        membershipType: input.membershipType,
        clientId: clientId ?? null,
      },
    });

    const acceptUrl = this.acceptUrl(token);
    const organizationName =
      (await this.repository.getOrganizationName(organizationId)) ?? '';
    await this.email
      .sendInvitation({ to: invitation.email, organizationName, acceptUrl })
      .catch((error: unknown) =>
        this.logger.warn(`Invitation email failed: ${String(error)}`),
      );

    return { invitationId: invitation.id, acceptUrl, expiresAt };
  }

  async revoke(organizationId: string, actorId: string, id: string) {
    if (!(await this.repository.revokePending(organizationId, id)))
      throw invalid('Not Found', 404, ErrorCodes.NOT_FOUND);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'invitation.revoke',
      entityType: 'invitation',
      entityId: id,
      after: { status: INVITATION_STATUS.REVOKED },
    });
  }

  /** Public details shown on the accept page; never reveals anything beyond the invitee's own invitation. */
  async preview(token: string) {
    const invitation = await this.findPending(token);
    const organizationName =
      (await this.repository.getOrganizationName(invitation.organizationId)) ??
      '';
    const account = await this.auth.hasAccount(invitation.email);
    return {
      email: invitation.email,
      organizationName,
      membershipType: invitation.membershipType,
      expiresAt: invitation.expiresAt,
      hasAccount: account,
    };
  }

  /** Accepts on behalf of an already-authenticated user whose email matches the invitation. */
  async accept(token: string, user: { userId: string; email: string }) {
    const invitation = await this.findPending(token);
    if (invitation.email !== user.email.toLowerCase()) {
      throw invalid(
        'Invitation belongs to another account',
        403,
        ErrorCodes.FORBIDDEN,
      );
    }
    return this.join(invitation, user.userId);
  }

  /** Signs in (or signs up) the invitee, joins the organisation and returns a session for it. */
  async redeem(input: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const invitation = await this.findPending(input.token);
    const user = await this.auth.resolveInvitee(invitation.organizationId, {
      email: invitation.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    const membership = await this.join(invitation, user.id);
    return this.auth.signInToMembership(user, membership.id);
  }

  private acceptUrl(token: string): string {
    const url = new URL(INVITE_PATH, this.config.get('WEB_APP_URL'));
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async findPending(token: string): Promise<InvitationRecord> {
    const invitation = await this.repository.findByTokenHash(hashToken(token));
    if (!invitation || invitation.status !== INVITATION_STATUS.PENDING)
      throw invalid('Invalid Invitation');
    if (invitation.expiresAt < new Date()) throw invalid('Invitation Expired');
    return invitation;
  }

  private async join(invitation: InvitationRecord, userId: string) {
    if (
      await this.repository.hasActiveMembership(
        invitation.organizationId,
        userId,
      )
    ) {
      throw invalid(
        'Already a member of this organisation',
        409,
        ErrorCodes.CONFLICT,
      );
    }
    const membershipType = invitation.membershipType as InvitableMembershipType;
    const chosenRoleIds = await this.roleAssignment.existingAssignableRoleIds(
      invitation.organizationId,
      invitation.roleIds,
    );
    const roleIds = chosenRoleIds.length
      ? chosenRoleIds
      : [
          await this.defaultRoles.roleIdFor(
            invitation.organizationId,
            membershipType,
          ),
        ];
    const { clientId } = scopeOf(invitation.scopePayload);

    const membership = await this.repository.acceptInvitation(invitation, {
      userId,
      roleIds,
      clientId,
    });

    await this.outbox.write({
      type: DomainEventTypes.INVITATION_ACCEPTED,
      version: 1,
      organizationId: invitation.organizationId,
      payload: { invitationId: invitation.id, membershipId: membership.id },
      actor: { id: userId, type: 'user' },
    });

    await this.audit.record({
      organizationId: invitation.organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'invitation.accept',
      entityType: 'invitation',
      entityId: invitation.id,
      after: {
        membershipId: membership.id,
        membershipType,
        clientId: clientId ?? null,
      },
    });

    return membership;
  }
}
