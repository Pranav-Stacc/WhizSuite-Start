import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { TenantContext } from '../tenant/tenant.context';

export function requireOrganizationId(
  paramOrgId?: string,
): string {
  const orgId = paramOrgId ?? TenantContext.getOrganizationId();
  if (!orgId) {
    throw new ProblemDetailsException(
      {
        type: 'about:blank',
        title: 'Tenant Required',
        status: 400,
        code: ErrorCodes.TENANT_REQUIRED,
        detail: 'x-organization-id header or route organizationId required',
      },
      400,
    );
  }
  return orgId;
}
