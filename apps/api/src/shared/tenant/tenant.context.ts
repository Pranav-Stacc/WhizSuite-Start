import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  organizationId: string;
  userId?: string;
  membershipId?: string;
  membershipType?: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<TenantContextData>();

export class TenantContext {
  static run<T>(data: TenantContextData, fn: () => T): T {
    return storage.run(data, fn);
  }

  static get(): TenantContextData | undefined {
    return storage.getStore();
  }

  static require(): TenantContextData {
    const ctx = storage.getStore();
    if (!ctx?.organizationId) {
      throw new Error('Tenant context is required');
    }
    return ctx;
  }

  static getOrganizationId(): string | undefined {
    return storage.getStore()?.organizationId;
  }

  static getCorrelationId(): string {
    return storage.getStore()?.correlationId ?? '00000000-0000-0000-0000-000000000000';
  }
}
