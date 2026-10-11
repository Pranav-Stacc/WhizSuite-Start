import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import {
  AUDIT_ROUTE_KEY,
  type AuditRouteMetadata,
} from '../../../../../shared/auth/audit-route.decorator';
import { AuditService } from '../../../application/services/audit.service';
import { TenantContext } from '../../../../../shared/tenant/tenant.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    const routePath = (req.route as { path?: string } | undefined)?.path;
    const orgId = TenantContext.getOrganizationId() ?? user?.organizationId;
    const custom = this.reflector.getAllAndOverride<AuditRouteMetadata>(
      AUDIT_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      tap({
        next: () => {
          if (!orgId || !user?.userId) return;
          void this.audit.record({
            organizationId: orgId,
            actorId: user.userId,
            actorType: 'user',
            action: custom?.action ?? `${method} ${routePath ?? req.path}`,
            entityType: custom?.entityType ?? 'http_request',
            metadata: { path: req.path, method },
          });
        },
      }),
    );
  }
}
