import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PermissionEffects,
  type Permission,
  type ScopeType,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { RedisService } from '../../../../shared/cache/redis.service';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly repo: AccessRepository,
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async getEffectivePermissions(
    organizationId: string,
    membershipId: string,
  ): Promise<Permission[]> {
    const cacheKey = this.redis.orgKey(
      organizationId,
      'authz',
      'user',
      membershipId,
      'v1',
    );
    const cached = await this.redis.getJson<Permission[]>(cacheKey);
    if (cached) return cached;

    const permissions = await this.repo.getEffectivePermissions(
      organizationId,
      membershipId,
    );
    await this.redis.setJson(
      cacheKey,
      permissions,
      this.config.get('AUTHZ_CACHE_TTL_SECONDS'),
    );
    return permissions;
  }

  async can(
    organizationId: string,
    membershipId: string,
    permission: Permission,
    resource?: { type: string; id: string },
  ): Promise<boolean> {
    const { grants, overrideEffect, isOwner } =
      await this.repo.getPermissionGrants(
        organizationId,
        membershipId,
        permission,
      );
    if (isOwner) return true;
    if (overrideEffect === PermissionEffects.DENY) return false;
    if (overrideEffect === PermissionEffects.ALLOW) return true;
    if (!grants.length) return false;

    for (const grant of grants) {
      if (grant.effect === 'DENY') continue;
      if (!resource || grant.scopeType === 'ORGANIZATION') return true;
      const allowed = await this.repo.isResourceInScope(
        organizationId,
        grant.scopeType as ScopeType,
        grant.resourceId,
        resource,
      );
      if (allowed) return true;
    }
    return false;
  }

  async invalidateCache(organizationId: string, membershipId: string) {
    await this.redis.delPattern(
      this.redis.orgKey(organizationId, 'authz', 'user', membershipId, '*'),
    );
  }

  /** Drops every member's cached permissions, e.g. after a role's permission set changes. */
  async invalidateOrganization(organizationId: string) {
    await this.redis.delPattern(
      this.redis.orgKey(organizationId, 'authz', 'user', '*'),
    );
  }
}
