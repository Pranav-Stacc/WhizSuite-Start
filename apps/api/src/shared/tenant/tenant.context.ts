import { AsyncLocalStorage } from 'node:async_hooks';
import type { MembershipType } from '@agency-os/contracts';

export interface TenantContextData {
  organizationId: string;
  userId?: string;
  membershipId?: string;
  membershipType?: string;
  /** Brand a CLIENT membership is restricted to; absent for staff. */
  clientId?: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

const CLIENT_MEMBERSHIP: MembershipType = 'CLIENT';

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

  static bindUser(user: {
    userId: string;
    organizationId?: string;
    membershipId?: string;
    membershipType?: string;
    clientId?: string;
  }): void {
    const ctx = storage.getStore();
    if (!ctx) return;
    ctx.organizationId = user.organizationId ?? '';
    ctx.userId = user.userId;
    ctx.membershipId = user.membershipId;
    ctx.membershipType = user.membershipType;
    ctx.clientId = user.clientId;
  }

  /**
   * Client ids the current principal may access, or `undefined` when unrestricted (staff).
   * A CLIENT membership without an assigned brand gets an empty scope and sees nothing.
   */
  static clientScope(): string[] | undefined {
    const ctx = storage.getStore();
    if (ctx?.membershipType !== CLIENT_MEMBERSHIP) return undefined;
    return ctx.clientId ? [ctx.clientId] : [];
  }

  static canAccessClient(clientId: string | null | undefined): boolean {
    const scope = TenantContext.clientScope();
    return !scope || (!!clientId && scope.includes(clientId));
  }

  static getOrganizationId(): string | undefined {
    return storage.getStore()?.organizationId;
  }

  static getCorrelationId(): string {
    return (
      storage.getStore()?.correlationId ??
      '00000000-0000-0000-0000-000000000000'
    );
  }
}
