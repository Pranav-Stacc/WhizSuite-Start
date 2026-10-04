import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../errors/problem-details.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
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
