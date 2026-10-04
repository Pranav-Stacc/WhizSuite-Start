import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import {
  DomainEventTypes,
  ErrorCodes,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { OutboxService } from '../../../../shared/events/outbox.service';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';
import { AuditService } from '../../../audit/application/services/audit.service';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
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

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await this.repo.createOrganizationWithOwner({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug.toLowerCase(),
    });

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

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: result.organization,
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

    const membership = await this.repo.findPrimaryMembership(user.id);
    const tokens = await this.issueTokens(user.id, user.email, {
      organizationId: membership?.organizationId,
      membershipId: membership?.id,
      membershipType: membership?.type,
    });

    await this.repo.updateLastLogin(user.id);
    if (membership) {
      await this.outbox.write({
        type: DomainEventTypes.USER_LOGIN_SUCCEEDED,
        version: 1,
        organizationId: membership.organizationId,
        payload: { userId: user.id },
        actor: { id: user.id, type: 'user' },
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
      ...tokens,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    ctx: {
      organizationId?: string;
      membershipId?: string;
      membershipType?: string;
    },
  ) {
    const familyId = randomUUID();
    const accessPayload = {
      sub: userId,
      email,
      organizationId: ctx.organizationId,
      membershipId: ctx.membershipId,
      membershipType: ctx.membershipType,
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
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
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
    if (!valid) {
      await this.repo.revokeFamilySessions(session.familyId);
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
    const tokens = await this.issueTokens(userRecord.id, userRecord.email, {
      organizationId: membership?.organizationId,
      membershipId: membership?.id,
      membershipType: membership?.type,
    });

    await this.repo.revokeSession(session.id);

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
