import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CAPABILITY_BY_ID,
  CAPABILITY_CATALOG,
  capabilityRequiresConfirmation,
  type CapabilityDefinition,
  type CapabilityToolDescriptor,
  type Permission,
} from '@agency-os/contracts';
import type { AppConfig } from '../../../../shared/config/app.config';
import { RedisService } from '../../../../shared/cache/redis.service';
import { zodToJsonSchema } from '../utils/zod-to-json-schema';

@Injectable()
export class CapabilityRegistryService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  get(id: string): CapabilityDefinition | undefined {
    return CAPABILITY_BY_ID.get(id);
  }

  listAll(): readonly CapabilityDefinition[] {
    return CAPABILITY_CATALOG;
  }

  /** Tools the user may invoke based on effective permissions. */
  listForUser(permissions: readonly Permission[]): CapabilityToolDescriptor[] {
    const granted = new Set(permissions);
    return CAPABILITY_CATALOG.filter((def) =>
      def.permissions.every((p) => granted.has(p)),
    ).map((def) => this.toDescriptor(def));
  }

  /**
   * Cached permission-filtered catalog for agent/MCP hot paths.
   * Keyed by org + user so role changes invalidate via short TTL.
   */
  async listForUserCached(
    organizationId: string,
    userId: string,
    permissions: readonly Permission[],
  ): Promise<CapabilityToolDescriptor[]> {
    const ttl =
      this.config.get('CAPABILITIES_CACHE_TTL_SECONDS', { infer: true }) ?? 90;
    const key = this.redis.orgKey(
      organizationId,
      'user',
      userId,
      'capabilities',
      'v1',
    );
    const cached = await this.redis.getJson<CapabilityToolDescriptor[]>(key);
    if (cached) return cached;

    const tools = this.listForUser(permissions);
    await this.redis.setJson(key, tools, ttl);
    return tools;
  }

  async invalidateUserCache(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const key = this.redis.orgKey(
      organizationId,
      'user',
      userId,
      'capabilities',
      'v1',
    );
    await this.redis.getClient().del(key);
  }

  canUserAccess(
    def: CapabilityDefinition,
    permissions: readonly Permission[],
  ): boolean {
    const granted = new Set(permissions);
    return def.permissions.every((p) => granted.has(p));
  }

  requiresConfirmation(def: CapabilityDefinition): boolean {
    return capabilityRequiresConfirmation(def);
  }

  private toDescriptor(def: CapabilityDefinition): CapabilityToolDescriptor {
    return {
      id: def.id,
      module: def.module,
      name: def.name,
      description: def.description,
      riskTier: def.riskTier,
      requiresConfirmation: capabilityRequiresConfirmation(def),
      inputSchema: zodToJsonSchema(def.inputSchema),
    };
  }
}
