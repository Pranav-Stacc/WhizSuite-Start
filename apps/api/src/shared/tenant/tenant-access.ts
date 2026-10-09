import { ErrorCodes } from '@agency-os/contracts';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { TenantContext } from './tenant.context';

const ORGANIZATION_ROUTE_PARAM = 'organizationId';
const ORGANIZATION_HEADER = 'x-organization-id';

function requestedOrganizationId(request: Request): string | undefined {
  const fromRoute: unknown = request.params?.[ORGANIZATION_ROUTE_PARAM];
  if (typeof fromRoute === 'string' && fromRoute) return fromRoute;
  const fromHeader = request.headers[ORGANIZATION_HEADER];
  return typeof fromHeader === 'string' && fromHeader ? fromHeader : undefined;
}

function tenantMismatch(): ProblemDetailsException {
  return new ProblemDetailsException(
    {
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      code: ErrorCodes.TENANT_MISMATCH,
      detail:
        'The requested organization does not match the authenticated session',
    },
    403,
  );
}

/**
 * Pins the request to the organization carried by the access token.
 * Any organization named in the route or header must be that same organization.
 */
export function bindAuthenticatedTenant(
  request: Request,
  user: AuthenticatedUser,
): void {
  const requested = requestedOrganizationId(request);
  if (requested && requested !== user.organizationId) throw tenantMismatch();
  TenantContext.bindUser(user);
}
