import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { DomainEventTypes, ErrorCodes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';
import { GoogleIdTokenVerifier } from '../../infrastructure/auth/google-id-token.verifier';
import { AuditService } from '../../../audit/application/services/audit.service';
import { DefaultRolesService } from '../../../access/application/services/default-roles.service';
import { AuthEmailService } from './auth-email.service';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  organizationName: string;
  organizationSlug: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleAuthInput {
  idToken: string;
  organizationName?: string;
  organizationSlug?: string;
}

interface TokenContext {
  organizationId?: string;
  membershipId?: string;
  membershipType?: string;
  clientId?: string;
}

const CLIENT_MEMBERSHIP = 'CLIENT';
const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly googleTokens: GoogleIdTokenVerifier,
    private readonly defaultRoles: DefaultRolesService,
    private readonly authEmail: AuthEmailService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Conflict',
          status: 409,
          code: ErrorCodes.CONFLICT,
          detail: 'Email already registered',
        },
        409,
      );
    }

    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_HASH_ROUNDS,
    );

    const result = await this.repo.createOrganizationWithOwner({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug.toLowerCase(),
    });

    await this.defaultRoles.provisionDefaultRoleTemplates(
      result.organization.id,
    );

    await this.outbox.write({
      type: DomainEventTypes.ORGANIZATION_CREATED,
      version: 1,
      organizationId: result.organization.id,
      payload: {
        organizationId: result.organization.id,
        slug: result.organization.slug,
      },
      actor: { id: result.user.id, type: 'user' },
    });

    await this.outbox.write({
      type: DomainEventTypes.USER_REGISTERED,
      version: 1,
      organizationId: result.organization.id,
      payload: { userId: result.user.id, email: result.user.email },
      actor: { id: result.user.id, type: 'user' },
    });

    const tokens = await this.issueTokens(result.user.id, result.user.email, {
      organizationId: result.organization.id,
      membershipId: result.membership.id,
      membershipType: result.membership.type,
    });

    void this.authEmail.sendWelcomeAfterRegister({
      email: result.user.email,
      firstName: result.user.firstName,
      organizationName: result.organization.name,
    });
    void this.authEmail.sendVerificationEmail(result.user.id);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: result.organization,
      defaultWorkspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findUserByEmail(input.email.toLowerCase());
    if (!user?.passwordHash) {
      await this.recordFailedLogin(input.email);
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.INVALID_CREDENTIALS,
        },
        401,
      );
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(input.email);
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.INVALID_CREDENTIALS,
        },
        401,
      );
    }

    return this.completeLogin(user);
  }

  /**
   * Verifies a Google ID token, links or creates the local user, and issues JWT session tokens.
   * New users without organizationName/slug must register a workspace first.
   */
  async loginWithGoogle(input: GoogleAuthInput) {
    const identity = await this.googleTokens.verify(input.idToken);
    const provider = this.googleTokens.provider();

    const linked = await this.repo.findOauthAccount(
      provider,
      identity.providerUserId,
    );
    if (linked) {
      return this.completeLogin(linked.user);
    }

    const existing = await this.repo.findUserByEmail(identity.email);
    if (existing) {
      await this.repo.linkOauthAccount({
        userId: existing.id,
        provider,
        providerUserId: identity.providerUserId,
      });
      await this.repo.markEmailVerified(existing.id, identity.pictureUrl);
      const membership = await this.repo.findPrimaryMembership(existing.id);
      if (membership) {
        await this.audit.record({
          organizationId: membership.organizationId,
          actorId: existing.id,
          actorType: 'user',
          action: 'auth.google_linked',
          entityType: 'user',
          entityId: existing.id,
          after: { provider, email: existing.email },
        });
      }
      return this.completeLogin(existing);
    }

    const wantsWorkspace =
      Boolean(input.organizationName?.trim()) &&
      Boolean(input.organizationSlug?.trim());
    if (!wantsWorkspace) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          code: ErrorCodes.ACCOUNT_NOT_FOUND,
          detail:
            'No WhizSuite account for this Google email — create a workspace first',
        },
        404,
      );
    }

    const firstName =
      identity.firstName?.trim() || identity.email.split('@')[0] || 'User';
    const result = await this.repo.createOrganizationWithOwner({
      email: identity.email,
      passwordHash: null,
      firstName,
      lastName: identity.lastName,
      organizationName: input.organizationName!.trim(),
      organizationSlug: input.organizationSlug!.trim().toLowerCase(),
      emailVerified: true,
      avatarUrl: identity.pictureUrl,
    });
    await this.repo.linkOauthAccount({
      userId: result.user.id,
      provider,
      providerUserId: identity.providerUserId,
    });

    await this.defaultRoles.provisionDefaultRoleTemplates(
      result.organization.id,
    );

    await this.outbox.write({
      type: DomainEventTypes.ORGANIZATION_CREATED,
      version: 1,
      organizationId: result.organization.id,
      payload: {
        organizationId: result.organization.id,
        slug: result.organization.slug,
      },
      actor: { id: result.user.id, type: 'user' },
    });
    await this.outbox.write({
      type: DomainEventTypes.USER_REGISTERED,
      version: 1,
      organizationId: result.organization.id,
      payload: { userId: result.user.id, email: result.user.email },
      actor: { id: result.user.id, type: 'user' },
    });
    await this.audit.record({
      organizationId: result.organization.id,
      actorId: result.user.id,
      actorType: 'user',
      action: 'auth.google_register',
      entityType: 'user',
      entityId: result.user.id,
      after: { email: result.user.email, provider },
    });

    const tokens = await this.issueTokens(result.user.id, result.user.email, {
      organizationId: result.organization.id,
      membershipId: result.membership.id,
      membershipType: result.membership.type,
    });
    await this.repo.updateLastLogin(result.user.id);
    await this.outbox.write({
      type: DomainEventTypes.USER_LOGIN_SUCCEEDED,
      version: 1,
      organizationId: result.organization.id,
      payload: { userId: result.user.id },
      actor: { id: result.user.id, type: 'user' },
    });
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: result.organization,
      defaultWorkspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      ...tokens,
    };
  }

  private async organizationForLogin(organizationId?: string) {
    if (!organizationId) return undefined;
    const org = await this.repo.findOrganizationById(organizationId);
    if (!org) return undefined;
    return { id: org.id, name: org.name, slug: org.slug };
  }

  private async completeLogin(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  }) {
    const membership = await this.repo.findPrimaryMembership(user.id);
    const organization = await this.organizationForLogin(membership?.organizationId);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      await this.membershipContext(membership),
    );

    await this.repo.updateLastLogin(user.id);
    if (membership) {
      await this.outbox.write({
        type: DomainEventTypes.USER_LOGIN_SUCCEEDED,
        version: 1,
        organizationId: membership.organizationId,
        payload: { userId: user.id },
        actor: { id: user.id, type: 'user' },
      });
      await this.audit.record({
        organizationId: membership.organizationId,
        actorId: user.id,
        actorType: 'user',
        action: 'auth.login',
        entityType: 'session',
        entityId: user.id,
        after: { email: user.email },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organizationId: membership?.organizationId,
      organization,
      ...tokens,
    };
  }

  async hasAccount(email: string): Promise<boolean> {
    return Boolean(await this.repo.findUserByEmail(email.toLowerCase()));
  }

  async activeMembershipIdForUser(
    organizationId: string,
    userId: string,
  ): Promise<string | null> {
    const membership = await this.repo.findActiveMembershipForUser(
      organizationId,
      userId,
    );
    return membership?.id ?? null;
  }

  /** Maps membership ids to user ids in one query; unknown ids are absent from the map. */
  async userIdsByMembership(
    organizationId: string,
    membershipIds: readonly string[],
  ): Promise<Map<string, string>> {
    if (membershipIds.length === 0) return new Map();
    const rows = await this.repo.findMembershipUsers(
      organizationId,
      membershipIds,
    );
    return new Map(rows.map((row) => [row.id, row.userId]));
  }

  /**
   * Creates an account or joins an existing user for an invitation redeem.
   * The invitation token already proved email ownership (same trust model as a
   * reset link), so the submitted password is set or updated — not verified.
   */
  async resolveInvitee(
    organizationId: string,
    input: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    },
  ) {
    const email = input.email.toLowerCase();
    const passwordHash = await bcrypt.hash(
      input.password,
      PASSWORD_HASH_ROUNDS,
    );
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      const user = await this.repo.setPasswordHash(existing.id, passwordHash);
      await this.audit.record({
        organizationId,
        actorId: user.id,
        actorType: 'user',
        action: 'auth.password_set',
        entityType: 'user',
        entityId: user.id,
        after: { via: 'invitation' },
      });
      return user;
    }
    if (!input.firstName) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Validation Failed',
          status: 400,
          code: ErrorCodes.VALIDATION_FAILED,
          detail: 'firstName is required to create an account',
        },
        400,
      );
    }
    const user = await this.repo.createUser({
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    await this.audit.record({
      organizationId,
      actorId: user.id,
      actorType: 'user',
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      after: { email },
    });
    return user;
  }

  /**
   * Creates or authenticates a portal-access invitee.
   * Temporary access may omit a password (passwordless guest until they claim).
   * Permanent access / existing password accounts require a valid password.
   */
  async resolvePortalAccessUser(
    organizationId: string,
    input: {
      email: string;
      firstName: string;
      lastName?: string;
      password?: string;
      requirePassword: boolean;
    },
  ) {
    const email = input.email.toLowerCase();
    const existing = await this.repo.findUserByEmail(email);
    if (existing) {
      if (existing.passwordHash) {
        if (!input.password) {
          throw new ProblemDetailsException(
            {
              type: 'about:blank',
              title: 'Password Required',
              status: 400,
              code: ErrorCodes.VALIDATION_FAILED,
              detail: 'This email already has an account — enter your password',
            },
            400,
          );
        }
        const valid = await bcrypt.compare(
          input.password,
          existing.passwordHash,
        );
        if (!valid) {
          throw new ProblemDetailsException(
            {
              type: 'about:blank',
              title: 'Unauthorized',
              status: 401,
              code: ErrorCodes.INVALID_CREDENTIALS,
            },
            401,
          );
        }
      } else if (input.password) {
        const passwordHash = await bcrypt.hash(
          input.password,
          PASSWORD_HASH_ROUNDS,
        );
        return this.repo.setPasswordHash(existing.id, passwordHash);
      }
      return existing;
    }

    if (input.requirePassword && !input.password) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Validation Failed',
          status: 400,
          code: ErrorCodes.VALIDATION_FAILED,
          detail: 'password is required for permanent portal access',
        },
        400,
      );
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS)
      : null;
    const user = await this.repo.createUser({
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    await this.audit.record({
      organizationId,
      actorId: user.id,
      actorType: 'user',
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      after: { email, portalAccess: true, passwordSet: Boolean(passwordHash) },
    });
    return user;
  }

  /** Sets a password on a passwordless (or upgrading) user for permanent login. */
  async claimPermanentPassword(
    userId: string,
    organizationId: string,
    password: string,
  ) {
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await this.repo.setPasswordHash(userId, passwordHash);
    await this.audit.record({
      organizationId,
      actorId: userId,
      actorType: 'user',
      action: 'user.password_set',
      entityType: 'user',
      entityId: userId,
      after: { claimed: true },
    });
    return user;
  }

  /** Issues a session bound to a specific membership (e.g. one just created from an invitation). */
  async signInToMembership(
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    },
    membershipId: string,
  ) {
    const membership = await this.repo.findMembershipById(membershipId);
    const organization = await this.organizationForLogin(membership?.organizationId);
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      await this.membershipContext(membership),
    );
    await this.repo.updateLastLogin(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organizationId: membership?.organizationId,
      organization,
      ...tokens,
    };
  }

  private async membershipContext(
    membership: { id: string; organizationId: string; type: string } | null,
  ): Promise<TokenContext> {
    if (!membership) return {};
    const clientId =
      membership.type === CLIENT_MEMBERSHIP
        ? await this.repo.findClientScope(
            membership.organizationId,
            membership.id,
          )
        : undefined;
    return {
      organizationId: membership.organizationId,
      membershipId: membership.id,
      membershipType: membership.type,
      clientId,
    };
  }

  /** Rotation passes the previous session's `familyId` so a replayed token can revoke the whole chain. */
  private async issueTokens(
    userId: string,
    email: string,
    ctx: TokenContext,
    familyId: string = randomUUID(),
  ) {
    const accessPayload = {
      sub: userId,
      email,
      organizationId: ctx.organizationId,
      membershipId: ctx.membershipId,
      membershipType: ctx.membershipType,
      clientId: ctx.clientId,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
    });

    const session = await this.repo.createSession({
      userId,
      refreshTokenHash: 'pending',
      familyId,
      expiresAt: new Date(
        Date.now() + this.config.get('JWT_REFRESH_TTL_SECONDS') * 1000,
      ),
    });
    const refreshToken = `${session.id}.${randomUUID()}`;
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.repo.rotateSession(session.id, {
      refreshTokenHash: refreshHash,
      expiresAt: session.expiresAt,
    });

    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }

  async refresh(refreshToken: string) {
    const [sessionId, tokenPart] = refreshToken.split('.');
    if (!sessionId || !tokenPart) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.SESSION_EXPIRED,
          detail: 'Invalid refresh token',
        },
        401,
      );
    }

    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.expiresAt < new Date()) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.SESSION_EXPIRED,
        },
        401,
      );
    }

    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    // A genuine token for an already-rotated session (or one claimed concurrently) means it was replayed.
    if (
      !valid ||
      session.revokedAt ||
      !(await this.repo.claimSession(session.id))
    ) {
      await this.repo.revokeFamilySessions(session.familyId);
      const membership = await this.repo.findPrimaryMembership(session.userId);
      if (membership) {
        await this.audit.record({
          organizationId: membership.organizationId,
          actorId: session.userId,
          actorType: 'user',
          action: 'auth.refresh',
          entityType: 'session',
          entityId: session.id,
          outcome: 'FAILURE',
          reason: ErrorCodes.TOKEN_REUSE_DETECTED,
        });
      }
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.TOKEN_REUSE_DETECTED,
          detail: 'Refresh token reuse detected — all sessions revoked',
        },
        401,
      );
    }

    const userRecord = await this.repo.findUserById(session.userId);
    if (!userRecord) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          code: ErrorCodes.UNAUTHORIZED,
        },
        401,
      );
    }

    const membership = await this.repo.findPrimaryMembership(userRecord.id);
    const tokens = await this.issueTokens(
      userRecord.id,
      userRecord.email,
      await this.membershipContext(membership),
      session.familyId,
    );
    if (membership) {
      await this.audit.record({
        organizationId: membership.organizationId,
        actorId: userRecord.id,
        actorType: 'user',
        action: 'auth.refresh',
        entityType: 'session',
        entityId: session.id,
      });
    }

    return {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
      },
      organizationId: membership?.organizationId,
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const [sessionId] = refreshToken.split('.');
    if (!sessionId) return { success: true };
    const session = await this.repo.findSessionById(sessionId);
    if (session && !session.revokedAt) {
      await this.repo.revokeSession(session.id);
    }
    return { success: true };
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const orgId = TenantContext.getOrganizationId();
    if (!orgId) return;
    await this.outbox.write({
      type: DomainEventTypes.USER_LOGIN_FAILED,
      version: 1,
      organizationId: orgId,
      payload: { email },
      actor: { id: '00000000-0000-0000-0000-000000000000', type: 'system' },
    });
  }
}
