import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Permission } from '@agency-os/contracts';
import { ErrorCodes } from '@agency-os/contracts';
import { ProblemDetailsException } from '../errors/problem-details.exception';
import { PERMISSIONS_ANY_KEY, PERMISSIONS_KEY } from './permissions.decorator';

export interface PermissionRequirements {
  all: Permission[];
  any: Permission[];
}

export function readPermissionRequirements(
  reflector: Reflector,
  context: ExecutionContext,
): PermissionRequirements {
  const targets = [context.getHandler(), context.getClass()];
  return {
    all: reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, targets) ?? [],
    any: reflector.getAllAndOverride<Permission[]>(PERMISSIONS_ANY_KEY, targets) ?? [],
  };
}

export function hasPermissionRequirements(requirements: PermissionRequirements): boolean {
  return requirements.all.length > 0 || requirements.any.length > 0;
}

function forbidden(detail: string): ProblemDetailsException {
  return new ProblemDetailsException(
    { type: 'about:blank', title: 'Forbidden', status: 403, code: ErrorCodes.FORBIDDEN, detail },
    403,
  );
}

/** Throws 403 unless the caller holds every `all` permission and at least one `any` permission. */
export function assertPermissionRequirements(
  requirements: PermissionRequirements,
  granted: readonly Permission[] | undefined,
): void {
  if (!granted) throw forbidden('Insufficient permissions');
  const held = new Set(granted);
  if (requirements.any.length > 0 && !requirements.any.some((p) => held.has(p))) {
    throw forbidden(`Missing one of: ${requirements.any.join(', ')}`);
  }
  if (!requirements.all.every((p) => held.has(p))) {
    throw forbidden(`Missing permissions: ${requirements.all.join(', ')}`);
  }
}
