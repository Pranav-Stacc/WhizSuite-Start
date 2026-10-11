import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ErrorCodes } from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import { EmailService } from '../../../../shared/notifications/email.service';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';

export const AUTH_EMAIL_TOKEN_RESET = 'RESET_PASSWORD';
export const AUTH_EMAIL_TOKEN_VERIFY = 'VERIFY_EMAIL';

const PASSWORD_HASH_ROUNDS = 12;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(
    private readonly repo: IdentityRepository,
    private readonly email: EmailService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async sendWelcomeAfterRegister(input: {
    email: string;
    firstName?: string | null;
    organizationName: string;
  }): Promise<void> {
    try {
      await this.email.sendWelcome({
        to: input.email,
        firstName: input.firstName,
        organizationName: input.organizationName,
      });
    } catch (err) {
      this.logger.warn(`Welcome email failed for ${input.email}: ${String(err)}`);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.repo.findUserByEmail(email.toLowerCase());
    if (!user?.passwordHash) return;

    const raw = randomBytes(32).toString('base64url');
    const ttlHours = this.config.get('AUTH_PASSWORD_RESET_TTL_HOURS');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await this.repo.invalidateAuthEmailTokens(user.id, AUTH_EMAIL_TOKEN_RESET);
    await this.repo.createAuthEmailToken({
      userId: user.id,
      type: AUTH_EMAIL_TOKEN_RESET,
      tokenHash: hashToken(raw),
      expiresAt,
    });

    const resetUrl = new URL('/reset-password', this.config.get('WEB_APP_URL'));
    resetUrl.searchParams.set('token', raw);

    try {
      await this.email.sendPasswordReset({
        to: user.email,
        firstName: user.firstName,
        resetUrl: resetUrl.toString(),
        expiresHours: ttlHours,
      });
    } catch (err) {
      this.logger.error(`Password reset email failed for ${user.email}: ${String(err)}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const row = await this.repo.findAuthEmailToken(hashToken(token), AUTH_EMAIL_TOKEN_RESET);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          code: ErrorCodes.VALIDATION_FAILED,
          detail: 'Invalid or expired reset link',
        },
        400,
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await this.repo.updatePasswordHash(row.userId, passwordHash);
    await this.repo.markAuthEmailTokenUsed(row.id);
    await this.repo.invalidateAuthEmailTokens(row.userId, AUTH_EMAIL_TOKEN_RESET);
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user) return;

    const raw = randomBytes(32).toString('base64url');
    const ttlHours = this.config.get('AUTH_EMAIL_VERIFY_TTL_HOURS');
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await this.repo.invalidateAuthEmailTokens(user.id, AUTH_EMAIL_TOKEN_VERIFY);
    await this.repo.createAuthEmailToken({
      userId: user.id,
      type: AUTH_EMAIL_TOKEN_VERIFY,
      tokenHash: hashToken(raw),
      expiresAt,
    });

    const verifyUrl = new URL('/verify-email', this.config.get('WEB_APP_URL'));
    verifyUrl.searchParams.set('token', raw);

    try {
      await this.email.sendEmailVerification({
        to: user.email,
        firstName: user.firstName,
        verifyUrl: verifyUrl.toString(),
      });
    } catch (err) {
      this.logger.warn(`Verification email failed for ${user.email}: ${String(err)}`);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const row = await this.repo.findAuthEmailToken(hashToken(token), AUTH_EMAIL_TOKEN_VERIFY);
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          code: ErrorCodes.VALIDATION_FAILED,
          detail: 'Invalid or expired verification link',
        },
        400,
      );
    }
    await this.repo.markEmailVerified(row.userId);
    await this.repo.markAuthEmailTokenUsed(row.id);
  }
}
