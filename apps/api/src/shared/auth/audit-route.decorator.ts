import { SetMetadata } from '@nestjs/common';

export const AUDIT_ROUTE_KEY = 'auditRoute';

export interface AuditRouteMetadata {
  action: string;
  entityType: string;
}

/** Overrides generic HTTP audit metadata for this handler. */
export const AuditRoute = (metadata: AuditRouteMetadata) =>
  SetMetadata(AUDIT_ROUTE_KEY, metadata);
