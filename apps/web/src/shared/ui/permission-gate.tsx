'use client';

import type { ReactNode } from 'react';
import type { Permission } from '@agency-os/contracts';

interface PermissionGateProps {
  /** Effective permissions for the current page (from the server). */
  granted: readonly Permission[];
  /** Show children when the member has any of these permissions. */
  anyOf: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Hides actions the member cannot use; matches API enforcement and avoids layout crashes after role changes. */
export function PermissionGate({ granted, anyOf, children, fallback = null }: PermissionGateProps) {
  const set = new Set(granted);
  const allowed = anyOf.some((permission) => set.has(permission));
  return allowed ? children : fallback;
}
