import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../../../shared/config/app.config';
import { AuthorizationService } from '../../../access/application/services/authorization.service';
import type { Permission } from '@agency-os/contracts';

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
    let permissions: Permission[] = [];
    if (payload.organizationId && payload.membershipId) {
      permissions = await this.authorization.getEffectivePermissions(
        payload.organizationId,
        payload.membershipId,
      );
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
  }
}
