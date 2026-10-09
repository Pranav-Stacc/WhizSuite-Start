import { AsyncLocalStorage } from 'node:async_hooks';
import type { MembershipType } from '@agency-os/contracts';

export interface TenantContextData {
  organizationId: string;
  userId?: string;
  membershipId?: string;
  membershipType?: string;
  /** Brand a CLIENT membership is restricted to; absent for staff. */
  clientId?: string;
  /**
   * Staff role-assignment scopes. `undefined` = not resolved yet / org-wide.
   * Empty array = explicitly no clients. Non-empty = restricted to those clients.
   */
  staffClientIds?: string[];
  staffProjectIds?: string[];
  staffContentIds?: string[];
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
   * Client ids the current principal may access, or `undefined` when unrestricted.
   * CLIENT memberships are pinned to their brand; staff may be narrowed by role scopes.
   */
  static clientScope(): string[] | undefined {
    const ctx = storage.getStore();
    if (ctx?.membershipType === CLIENT_MEMBERSHIP) {
      return ctx.clientId ? [ctx.clientId] : [];
    }
    if (ctx?.staffClientIds !== undefined) return ctx.staffClientIds;
    return undefined;
  }

  /** Project ids from staff role scopes, or `undefined` when unrestricted / not set. */
  static projectScope(): string[] | undefined {
    const ctx = storage.getStore();
    if (ctx?.membershipType === CLIENT_MEMBERSHIP) return undefined;
    return ctx?.staffProjectIds;
  }

  /** Content ids from staff role scopes, or `undefined` when unrestricted / not set. */
  static contentScope(): string[] | undefined {
    const ctx = storage.getStore();
    if (ctx?.membershipType === CLIENT_MEMBERSHIP) return undefined;
    return ctx?.staffContentIds;
  }

  static bindDataScope(scope: {
    clientIds?: string[];
    projectIds?: string[];
    contentIds?: string[];
  }): void {
    const ctx = storage.getStore();
    if (!ctx) return;
    if (scope.clientIds) ctx.staffClientIds = scope.clientIds;
    if (scope.projectIds) ctx.staffProjectIds = scope.projectIds;
    if (scope.contentIds) ctx.staffContentIds = scope.contentIds;
  }

  static canAccessClient(clientId: string | null | undefined): boolean {
    const scope = TenantContext.clientScope();
    return !scope || (!!clientId && scope.includes(clientId));
  }

  static canAccessProject(projectId: string | null | undefined): boolean {
    const scope = TenantContext.projectScope();
    return !scope || (!!projectId && scope.includes(projectId));
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
