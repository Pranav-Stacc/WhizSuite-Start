import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Permission } from '@agency-os/contracts';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  membershipId?: string;
  organizationId?: string;
  membershipType?: string;
  /** Set only for CLIENT memberships: the single brand this user may see. */
  clientId?: string;
  /** Effective permissions from the member's role assignments in the current organisation. */
  permissions?: readonly Permission[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser | undefined;
  },
);
