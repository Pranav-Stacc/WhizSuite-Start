import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@agency-os/contracts';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_ANY_KEY = 'permissions_any';

/** Caller must hold every listed permission. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Caller must hold at least one listed permission. */
export const RequireAnyPermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
