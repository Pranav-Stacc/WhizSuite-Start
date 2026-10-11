import { Injectable } from '@nestjs/common';
import type { ApproverSpec, ScopeType } from '@agency-os/contracts';
import { AuthService } from '../../../identity/application/services/auth.service';
import { RoleAssignmentService } from '../../../access/application/services/role-assignment.service';
import { ClientsRepository } from '../../../clients/infrastructure/repositories/clients.repository';

@Injectable()
export class ApproverResolutionService {
  constructor(
    private readonly roles: RoleAssignmentService,
    private readonly auth: AuthService,
    private readonly clients: ClientsRepository,
  ) {}

  /**
   * Expands role pools (+ optional data scope) into concrete user ids and merges
   * with explicit `approverIds`. Result is stored on the step as `resolvedUserIds`.
   */
  async resolve(
    organizationId: string,
    spec: ApproverSpec,
  ): Promise<ApproverSpec> {
    const basis = spec.basis;
    const targets = [...new Set(spec.targetIds ?? [])];
    const userIds = new Set(
      basis === 'PERSON' || !basis
        ? [...(spec.approverIds ?? []), ...(basis === 'PERSON' ? targets : [])]
        : (spec.approverIds ?? []),
    );
    if (basis === 'CLIENT_CONTACT' && targets.length > 0) {
      for (const id of await this.clients.userIdsForContacts(
        organizationId,
        targets,
      )) {
        userIds.add(id);
      }
    }
    if (basis === 'ASSIGNEE') {
      for (const id of spec.assigneeUserIds ?? []) userIds.add(id);
    }
    const roleIds = [
      ...new Set(basis === 'ROLE' ? targets : (spec.roleIds ?? [])),
    ];
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
    const pooled =
      basis === 'DESIGNATION'
        ? await this.roles.membershipIdsForDesignations(organizationId, targets)
        : basis === 'DEPARTMENT'
          ? await this.roles.membershipIdsInDepartments(organizationId, targets)
          : basis === 'CLIENT' || basis === 'PROJECT'
            ? await this.roles.membershipIdsWithResourceAccess(
                organizationId,
                basis,
                targets,
              )
            : [];
    for (const id of pooled) membershipIds.add(id);

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
      basis,
      targetIds: targets,
      resolvedUserIds: [...userIds],
    };
  }
}
