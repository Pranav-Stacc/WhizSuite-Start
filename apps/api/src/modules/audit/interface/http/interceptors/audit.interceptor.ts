import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from '../../../application/services/audit.service';
import type { AuthenticatedUser } from '../../../../../shared/auth/current-user.decorator';
import { TenantContext } from '../../../../../shared/tenant/tenant.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    const orgId = TenantContext.getOrganizationId() ?? user?.organizationId;

    return next.handle().pipe(
      tap({
        next: () => {
          if (!orgId || !user?.userId) return;
          void this.audit.record({
            organizationId: orgId,
            actorId: user.userId,
            actorType: 'user',
            action: `${method} ${req.route?.path ?? req.path}`,
            entityType: 'http_request',
            metadata: { path: req.path, method },
          });
        },
      }),
    );
  }
}
