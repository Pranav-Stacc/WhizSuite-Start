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
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { ClientsService } from '../../../clients/application/services/clients.service';
import { AuthService } from '../../../identity/application/services/auth.service';
import {
  INVITATION_LINK_STATUS,
  INVITATION_STATUS,
  InvitationsRepository,
  PORTAL_ACCESS_MODE,
  scopeOf,
} from '../../infrastructure/repositories/invitations.repository';

const TOKEN_BYTES = 32;
const MS_PER_HOUR = 3_600_000;
const CLIENT_MEMBERSHIP: InvitableMembershipType = 'CLIENT';
const INVITE_PATH = '/invite';
const PORTAL_ACCESS_PATH = '/portal-access';

type InvitationRecord = NonNullable<
  Awaited<ReturnType<InvitationsRepository['findByTokenHash']>>
>;
type InvitationLinkRecord = NonNullable<
  Awaited<ReturnType<InvitationsRepository['findLinkByTokenHash']>>
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
    const clientScope = TenantContext.clientScope();
    return rows
      .map(({ scopePayload, ...row }) => ({
        ...row,
        clientId: scopeOf(scopePayload).clientId ?? null,
      }))
      .filter((row) => {
        if (!clientScope) return true;
        if (!row.clientId) return clientScope.length === 0;
        return clientScope.includes(row.clientId);
      });
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

  async listPortalAccessLinks(organizationId: string, clientId?: string) {
    const rows = await this.repository.listLinks(organizationId);
    return rows
      .map(({ scopePayload, ...row }) => ({
        ...row,
        clientId: scopeOf(scopePayload).clientId ?? null,
      }))
      .filter((row) => {
        if (clientId && row.clientId !== clientId) return false;
        const scope = TenantContext.clientScope();
        if (!scope) return true;
        if (!row.clientId) return scope.length === 0;
        return scope.includes(row.clientId);
      });
  }

  /** Multi-use (or capped) shareable link for a client's portal — works in browser or app. */
  async createPortalAccessLink(
    organizationId: string,
    actorId: string,
    input: {
      clientId: string;
      accessMode?: 'TEMPORARY' | 'PERMANENT';
      linkExpiresInHours?: number;
      membershipTtlHours?: number;
      maxUses?: number;
      allowedDomains?: string[];
      roleIds?: string[];
    },
  ) {
    await this.clients.get(organizationId, input.clientId);
    if (input.roleIds?.length) {
      await this.roleAssignment.requireAssignableRoles(
        organizationId,
        input.roleIds,
      );
    }

    const accessMode = input.accessMode ?? PORTAL_ACCESS_MODE.TEMPORARY;
    const linkTtl: number =
      input.linkExpiresInHours ??
      this.config.get('PORTAL_ACCESS_LINK_TTL_HOURS');
    const membershipTtlHours: number | null =
      accessMode === PORTAL_ACCESS_MODE.TEMPORARY
        ? (input.membershipTtlHours ??
          this.config.get('PORTAL_ACCESS_TEMP_MEMBERSHIP_HOURS'))
        : null;
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + linkTtl * MS_PER_HOUR);

    const link = await this.repository.createLink({
      organizationId,
      tokenHash: hashToken(token),
      membershipType: CLIENT_MEMBERSHIP,
      roleIds: input.roleIds ?? [],
      scope: { clientId: input.clientId },
      accessMode,
      membershipTtlHours,
      maxUses: input.maxUses ?? null,
      allowedDomains: (input.allowedDomains ?? []).map((d) =>
        d.toLowerCase().replace(/^@/, ''),
      ),
      createdById: actorId,
      expiresAt,
    });

    await this.outbox.write({
      type: DomainEventTypes.PORTAL_ACCESS_LINK_CREATED,
      version: 1,
      organizationId,
      payload: {
        linkId: link.id,
        clientId: input.clientId,
        accessMode,
      },
      actor: { id: actorId, type: 'user' },
    });

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'portal_access_link.create',
      entityType: 'invitation_link',
      entityId: link.id,
      after: {
        clientId: input.clientId,
        accessMode,
        membershipTtlHours,
        maxUses: input.maxUses ?? null,
        expiresAt,
      },
    });

    return {
      linkId: link.id,
      shareUrl: this.portalAccessUrl(token),
      accessMode,
      membershipTtlHours,
      maxUses: link.maxUses,
      expiresAt,
    };
  }

  async revokePortalAccessLink(
    organizationId: string,
    actorId: string,
    linkId: string,
  ) {
    if (!(await this.repository.revokeLink(organizationId, linkId)))
      throw invalid('Not Found', 404, ErrorCodes.NOT_FOUND);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'portal_access_link.revoke',
      entityType: 'invitation_link',
      entityId: linkId,
      after: { status: INVITATION_LINK_STATUS.REVOKED },
    });
  }

  async previewPortalAccess(token: string) {
    const link = await this.findActiveLink(token);
    const organizationName =
      (await this.repository.getOrganizationName(link.organizationId)) ?? '';
    const { clientId } = scopeOf(link.scopePayload);
    const clientName = clientId
      ? await this.clients.displayNameInOrganization(
          link.organizationId,
          clientId,
        )
      : null;
    return {
      organizationName,
      clientName,
      accessMode: link.accessMode,
      membershipTtlHours: link.membershipTtlHours,
      expiresAt: link.expiresAt,
      passwordRequired: link.accessMode === PORTAL_ACCESS_MODE.PERMANENT,
      allowedDomains: link.allowedDomains,
      appStoreUrl:
        this.config.get('MOBILE_APP_STORE_URL', { infer: true }) || null,
      playStoreUrl:
        this.config.get('MOBILE_PLAY_STORE_URL', { infer: true }) || null,
    };
  }

  async redeemPortalAccess(input: {
    token: string;
    email: string;
    firstName: string;
    lastName?: string;
    password?: string;
  }) {
    const link = await this.findActiveLink(input.token);
    this.assertAllowedDomain(link.allowedDomains, input.email);

    const requirePassword = link.accessMode === PORTAL_ACCESS_MODE.PERMANENT;
    const user = await this.auth.resolvePortalAccessUser(link.organizationId, {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
      requirePassword,
    });

    if (
      await this.repository.hasActiveMembership(link.organizationId, user.id)
    ) {
      // Already a member — just sign them into this org (link still counts as a use).
      if (!(await this.repository.consumeLinkUse(link.id, link.maxUses))) {
        throw invalid(
          'This access link has reached its use limit',
          410,
          ErrorCodes.INVITATION_EXPIRED,
        );
      }
      const membershipId = await this.auth.activeMembershipIdForUser(
        link.organizationId,
        user.id,
      );
      if (!membershipId)
        throw invalid('Membership unavailable', 409, ErrorCodes.CONFLICT);
      return this.auth.signInToMembership(user, membershipId);
    }

    if (!(await this.repository.consumeLinkUse(link.id, link.maxUses))) {
      throw invalid(
        'This access link has reached its use limit',
        410,
        ErrorCodes.INVITATION_EXPIRED,
      );
    }

    const membership = await this.joinFromLink(link, user.id);

    await this.outbox.write({
      type: DomainEventTypes.PORTAL_ACCESS_REDEEMED,
      version: 1,
      organizationId: link.organizationId,
      payload: {
        linkId: link.id,
        membershipId: membership.id,
        accessMode: link.accessMode,
      },
      actor: { id: user.id, type: 'user' },
    });

    await this.audit.record({
      organizationId: link.organizationId,
      actorId: user.id,
      actorType: 'user',
      action: 'portal_access.redeem',
      entityType: 'invitation_link',
      entityId: link.id,
      after: {
        membershipId: membership.id,
        accessMode: link.accessMode,
        expiresAt: membership.expiresAt,
      },
    });

    return this.auth.signInToMembership(user, membership.id);
  }

  /** Temporary (or passwordless) client sets a password and keeps permanent portal access. */
  async claimPortalAccess(
    user: { userId: string; membershipId?: string },
    password: string,
  ) {
    if (!user.membershipId) {
      throw invalid('No active membership', 400, ErrorCodes.VALIDATION_FAILED);
    }
    const cleared = await this.repository.clearMembershipExpiry(
      user.membershipId,
    );
    await this.auth.claimPermanentPassword(
      user.userId,
      cleared.organizationId,
      password,
    );

    await this.outbox.write({
      type: DomainEventTypes.PORTAL_ACCESS_CLAIMED,
      version: 1,
      organizationId: cleared.organizationId,
      payload: { membershipId: user.membershipId },
      actor: { id: user.userId, type: 'user' },
    });

    await this.audit.record({
      organizationId: cleared.organizationId,
      actorId: user.userId,
      actorType: 'user',
      action: 'portal_access.claim',
      entityType: 'organization_membership',
      entityId: user.membershipId,
      after: { permanent: true },
    });

    return { permanent: true as const, membershipId: user.membershipId };
  }

  private acceptUrl(token: string): string {
    const url = new URL(INVITE_PATH, this.config.get('WEB_APP_URL'));
    url.searchParams.set('token', token);
    return url.toString();
  }

  private portalAccessUrl(token: string): string {
    const url = new URL(PORTAL_ACCESS_PATH, this.config.get('WEB_APP_URL'));
    url.searchParams.set('token', token);
    return url.toString();
  }

  private assertAllowedDomain(allowedDomains: string[], email: string) {
    if (!allowedDomains.length) return;
    const domain = email.toLowerCase().split('@')[1];
    if (!domain || !allowedDomains.includes(domain)) {
      throw invalid(
        'Email domain is not allowed for this access link',
        403,
        ErrorCodes.FORBIDDEN,
      );
    }
  }

  private async findPending(token: string): Promise<InvitationRecord> {
    const invitation = await this.repository.findByTokenHash(hashToken(token));
    if (!invitation || invitation.status !== INVITATION_STATUS.PENDING)
      throw invalid('Invalid Invitation');
    if (invitation.expiresAt < new Date()) throw invalid('Invitation Expired');
    return invitation;
  }

  private async findActiveLink(token: string): Promise<InvitationLinkRecord> {
    const link = await this.repository.findLinkByTokenHash(hashToken(token));
    if (!link || link.status !== INVITATION_LINK_STATUS.ACTIVE) {
      throw invalid('Invalid Access Link', 400, ErrorCodes.INVITATION_REVOKED);
    }
    if (link.expiresAt < new Date())
      throw invalid('Access Link Expired', 400, ErrorCodes.INVITATION_EXPIRED);
    if (link.maxUses != null && link.useCount >= link.maxUses) {
      throw invalid(
        'This access link has reached its use limit',
        410,
        ErrorCodes.INVITATION_EXPIRED,
      );
    }
    return link;
  }

  private async joinFromLink(link: InvitationLinkRecord, userId: string) {
    const membershipType = link.membershipType as InvitableMembershipType;
    const chosenRoleIds = await this.roleAssignment.existingAssignableRoleIds(
      link.organizationId,
      link.roleIds,
    );
    const roleIds = chosenRoleIds.length
      ? chosenRoleIds
      : [
          await this.defaultRoles.roleIdFor(
            link.organizationId,
            membershipType,
          ),
        ];
    const { clientId } = scopeOf(link.scopePayload);
    const expiresAt =
      link.accessMode === PORTAL_ACCESS_MODE.TEMPORARY &&
      link.membershipTtlHours
        ? new Date(Date.now() + link.membershipTtlHours * MS_PER_HOUR)
        : null;

    return this.repository.grantMembershipFromLink({
      organizationId: link.organizationId,
      membershipType,
      userId,
      roleIds,
      clientId,
      expiresAt,
    });
  }

  private async join(invitation: InvitationRecord, userId: string) {
    // Same email may already be a client or staff member — merge roles/scopes instead of rejecting.
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
      payload: {
        invitationId: invitation.id,
        membershipId: membership.id,
        invitedById: invitation.invitedById,
        title: invitation.email,
      },
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
