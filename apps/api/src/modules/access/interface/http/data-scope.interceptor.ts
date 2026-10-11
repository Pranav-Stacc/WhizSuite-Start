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
    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      originalUrl?: string;
      url?: string;
    }>();
    const user = request.user;
    if (
      user?.organizationId &&
      user.membershipId &&
      user.membershipType !== CLIENT_MEMBERSHIP
    ) {
      const scope = await this.access.resolveDataScope(
        user.organizationId,
        user.membershipId,
        request.originalUrl ?? request.url,
      );
      if (!scope.orgWide) {
        const hasClientIds = scope.clientIds.length > 0;
        TenantContext.bindDataScope({
          clientIds: hasClientIds
            ? scope.clientIds
            : scope.selfOnly
              ? undefined
              : [],
          projectIds:
            scope.projectIds.length > 0 ? scope.projectIds : undefined,
          contentIds:
            scope.contentIds.length > 0 ? scope.contentIds : undefined,
          selfOnly: scope.selfOnly,
        });
      }
    }
    return next.handle();
  }
}
