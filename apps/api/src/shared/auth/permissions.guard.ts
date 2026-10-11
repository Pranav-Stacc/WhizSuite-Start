import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@agency-os/contracts';
import {
  assertPermissionRequirements,
  hasPermissionRequirements,
  readPermissionRequirements,
} from './permission-requirements';
import type { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirements = readPermissionRequirements(this.reflector, context);
    if (!hasPermissionRequirements(requirements)) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser & { permissions?: Permission[] };
    }>();
    assertPermissionRequirements(requirements, request.user?.permissions);
    return true;
  }
}
