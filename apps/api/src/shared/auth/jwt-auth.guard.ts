import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes } from '@agency-os/contracts';
import type { Request } from 'express';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { bindAuthenticatedTenant } from '../tenant/tenant-access';
import type { AuthenticatedUser } from './current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;
    const request = context.switchToHttp().getRequest<Request>();
    bindAuthenticatedTenant(request, request.user as AuthenticatedUser);
    return true;
  }

  handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw new ProblemDetailsException(
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
    return user;
  }
}
