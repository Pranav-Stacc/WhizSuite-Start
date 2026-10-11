import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../../../shared/config/app.config';
import { AuthorizationService } from '../../../access/application/services/authorization.service';
import type { Permission } from '@agency-os/contracts';
import { TenantContext } from '../../../../shared/tenant/tenant.context';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string;
  membershipId?: string;
  membershipType?: string;
  clientId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly authorization: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const buildUser = async () => {
      let permissions: Permission[] = [];
      if (payload.organizationId && payload.membershipId) {
        try {
          permissions = await this.authorization.getEffectivePermissions(
            payload.organizationId,
            payload.membershipId,
          );
        } catch (error) {
          this.logger.warn(
            `Permission resolution failed during authentication for ${payload.sub}; failing closed`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return {
        userId: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        membershipId: payload.membershipId,
        membershipType: payload.membershipType,
        clientId: payload.clientId,
        permissions,
      };
    };

    if (!payload.organizationId) return buildUser();

    return TenantContext.run(
      {
        organizationId: payload.organizationId,
        userId: payload.sub,
        membershipId: payload.membershipId,
        membershipType: payload.membershipType,
        clientId: payload.clientId,
        correlationId: randomUUID(),
      },
      buildUser,
    );
  }
}
