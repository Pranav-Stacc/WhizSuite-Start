import type { AuthenticatedUser } from '../shared/auth/current-user.decorator';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {
      permissions?: string[];
    }
  }
}

export {};
