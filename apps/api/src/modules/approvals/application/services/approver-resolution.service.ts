import { Injectable } from '@nestjs/common';
import type { ApproverSpec, ScopeType } from '@agency-os/contracts';
import { AuthService } from '../../../identity/application/services/auth.service';
import { RoleAssignmentService } from '../../../access/application/services/role-assignment.service';

@Injectable()
export class ApproverResolutionService {
  constructor(
    private readonly roles: RoleAssignmentService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Expands role pools (+ optional data scope) into concrete user ids and merges
   * with explicit `approverIds`. Result is stored on the step as `resolvedUserIds`.
   */
  async resolve(
    organizationId: string,
    spec: ApproverSpec,
  ): Promise<ApproverSpec> {
    const userIds = new Set(spec.approverIds ?? []);
    const roleIds = [...new Set(spec.roleIds ?? [])];
    const scope = spec.scopeType
      ? {
          scopeType: spec.scopeType as ScopeType,
          resourceId: spec.scopeResourceId ?? undefined,
        }
      : undefined;

    const membershipIds = new Set<string>();
    for (const roleId of roleIds) {
      const holders = await this.roles.membershipIdsForRole(
        organizationId,
        roleId,
        scope,
      );
      for (const id of holders) membershipIds.add(id);
    }

    if (membershipIds.size > 0) {
      const usersByMembership = await this.auth.userIdsByMembership(
        organizationId,
        [...membershipIds],
      );
      for (const userId of usersByMembership.values()) userIds.add(userId);
    }

    return {
      ...spec,
      approverIds: [...new Set(spec.approverIds ?? [])],
      roleIds,
      resolvedUserIds: [...userIds],
    };
  }
}
