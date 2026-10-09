import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../../../../shared/auth/current-user.decorator';
import { TenantContext } from '../../../../shared/tenant/tenant.context';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';

const CLIENT_MEMBERSHIP = 'CLIENT';

/** After JWT auth, compiles staff role scopes into TenantContext list filters. */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(private readonly access: AccessRepository) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (
      user?.organizationId &&
      user.membershipId &&
      user.membershipType !== CLIENT_MEMBERSHIP
    ) {
      const scope = await this.access.resolveDataScope(
        user.organizationId,
        user.membershipId,
      );
      if (!scope.orgWide) {
        // Empty project/content arrays mean "no restriction on that dimension"
        // (CLIENT-only staff still see all projects/content for their clients).
        TenantContext.bindDataScope({
          clientIds: scope.clientIds,
          projectIds: scope.projectIds.length > 0 ? scope.projectIds : undefined,
          contentIds: scope.contentIds.length > 0 ? scope.contentIds : undefined,
        });
      }
    }
    return next.handle();
  }
}
