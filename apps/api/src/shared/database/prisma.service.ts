import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../tenant/tenant.context';
import type { AppConfig } from '../config/app.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super({
      datasources: { db: { url: config.get('DATABASE_URL') } },
      log:
        config.get('NODE_ENV') === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Run callback inside a transaction with tenant RLS context set */
  async withTenant<T>(
    organizationId: string,
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_org_id', $1, true)`,
        organizationId,
      );
      return fn(tx as PrismaClient);
    });
  }

  /** Scoped client helper — always requires tenant from context for tenant tables */
  requireOrganizationId(): string {
    const orgId = TenantContext.getOrganizationId();
    if (!orgId) {
      throw new Error('organizationId required in tenant context');
    }
    return orgId;
  }
}
