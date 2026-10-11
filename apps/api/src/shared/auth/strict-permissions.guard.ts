import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@agency-os/contracts';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { ALLOW_AUTHENTICATED_KEY } from './allow-authenticated.decorator';
import { IS_PUBLIC_KEY } from './public-route.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from './current-user.decorator';

const TENANT_ROUTE_PATTERN = /\/organizations\/[^/]+/;

@Injectable()
export class StrictPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser & { permissions?: Permission[] };
      route?: { path?: string };
      path?: string;
    }>();

    if (allowAuthenticated) {
      if (!request.user?.userId) {
        throw this.unauthorized();
      }
      return true;
    }

    if (required?.length) {
      return this.assertPermissions(required, request.user);
    }

    const routePath = request.route?.path ?? request.path ?? '';
    if (TENANT_ROUTE_PATTERN.test(routePath) || routePath.includes('audit-logs')) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          code: ErrorCodes.FORBIDDEN,
          detail: 'Route is missing permission metadata',
        },
        403,
      );
    }

    if (!request.user?.userId) {
      throw this.unauthorized();
    }

    return true;
  }

  private assertPermissions(
    required: Permission[],
    user?: AuthenticatedUser & { permissions?: Permission[] },
  ): boolean {
    if (!user?.permissions) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          code: ErrorCodes.FORBIDDEN,
          detail: 'Insufficient permissions',
        },
        403,
      );
    }
    const allowed = required.every((p) => user.permissions!.includes(p));
    if (!allowed) {
      throw new ProblemDetailsException(
        {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          code: ErrorCodes.FORBIDDEN,
          detail: `Missing permissions: ${required.join(', ')}`,
        },
        403,
      );
    }
    return true;
  }

  private unauthorized(): ProblemDetailsException {
    return new ProblemDetailsException(
      {
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        code: ErrorCodes.UNAUTHORIZED,
        detail: 'Authentication required',
      },
      401,
    );
  }
}
