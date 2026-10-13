import {
  DEFAULT_MEMBERSHIP_ROLES,
  isPermission,
  type AccessCapabilities,
  type Permission,
} from '@agency-os/contracts';
import { isLiveMode } from '@/shared/config/env';
import { ROLE_TO_MEMBERSHIP } from './roles';
import type { Session } from './session';

/**
 * Single source of truth for which permission keys drive nav, pages, search, and server actions.
 *
 * Live mode: only explicit keys from `GET /v1/access/capabilities` (never membership templates,
 * never role.permissionKeys, never companion expansion).
 * Demo mode: membership persona templates only.
 */
export function resolveSessionPermissions(
  session: Session,
  access: AccessCapabilities | null,
  liveMode: boolean = isLiveMode,
): Permission[] {
  if (!liveMode || session.demo) {
    return [...DEFAULT_MEMBERSHIP_ROLES[ROLE_TO_MEMBERSHIP[session.role]].permissions];
  }
  if (access) {
    return access.permissions.filter(isPermission);
  }
  return [];
}
