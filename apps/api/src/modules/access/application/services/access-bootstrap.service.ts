import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Permissions } from '@agency-os/contracts';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';

@Injectable()
export class AccessBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AccessBootstrapService.name);

  constructor(private readonly repo: AccessRepository) {}

  async onModuleInit(): Promise<void> {
    const catalog = Object.values(Permissions).map((key) => ({
      key,
      category: key.split('.')[0] ?? 'general',
    }));
    await this.repo.seedPermissions(catalog);
    this.logger.log(`Permission catalog ready (${catalog.length} permissions)`);
  }
}
