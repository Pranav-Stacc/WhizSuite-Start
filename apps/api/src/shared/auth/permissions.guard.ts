import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@agency-os/contracts';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser & { permissions?: Permission[] } }>();
    const user = request.user;
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
}
