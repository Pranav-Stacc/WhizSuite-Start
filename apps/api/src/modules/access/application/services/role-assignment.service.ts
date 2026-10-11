import { HttpStatus, Injectable } from '@nestjs/common';
import {
  MEMBERSHIP_DEFAULT_ROLE_NAME,
  ErrorCodes,
  type AccessRoleSummary,
  type RoleAssignmentScopeInput,
  type ScopeType,
} from '@agency-os/contracts';
import { OWNER_MEMBERSHIP_TYPE } from '../../config/default-roles';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';
import { AuthorizationService } from './authorization.service';

const MEMBERSHIP_ENTITY_TYPE = 'membership';
const OWNER_ROLE_NAME = MEMBERSHIP_DEFAULT_ROLE_NAME[OWNER_MEMBERSHIP_TYPE];

function isOwnerRole(role: AccessRoleSummary): boolean {
  return role.isSystem && role.name === OWNER_ROLE_NAME;
}

/** Public entry point other modules use to read and change which roles a member holds. */
@Injectable()
export class RoleAssignmentService {
  constructor(
    private readonly repository: AccessRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  rolesByMembership(organizationId: string, membershipIds?: readonly string[]) {
    return this.repository.rolesByMembership(organizationId, membershipIds);
  }

  /**
   * Resolves role ids against this organisation only, so a role from another tenant can never be granted.
   * Ownership is not grantable through roles; it stays with the organisation's owner membership.
   */
  async requireAssignableRoles(
    organizationId: string,
    roleIds: readonly string[],
  ): Promise<AccessRoleSummary[]> {
    const unique = [...new Set(roleIds)];
    const roles = await this.repository.findRoles(organizationId, unique);
    if (roles.length !== unique.length) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Unknown role',
        ErrorCodes.VALIDATION_FAILED,
        'One or more roles do not exist in this organisation',
      );
    }
    if (roles.some(isOwnerRole)) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Owner role cannot be assigned',
        ErrorCodes.VALIDATION_FAILED,
      );
    }
    return roles;
  }

  /** Roles from the list that still exist and may be granted; used when an earlier choice may be stale. */
  async existingAssignableRoleIds(
    organizationId: string,
    roleIds: readonly string[],
  ): Promise<string[]> {
    const roles = await this.repository.findRoles(organizationId, roleIds);
    return roles.filter((role) => !isOwnerRole(role)).map((role) => role.id);
  }

  /**
   * Memberships that hold a role — used by workflow/approval engines to resolve
   * stage assignee pools (optionally narrowed by client/project scope).
   */
  membershipIdsForRole(
    organizationId: string,
    roleId: string,
    scope?: { scopeType: ScopeType; resourceId?: string | null },
  ) {
    return this.repository.membershipIdsForRole(organizationId, roleId, scope);
  }

  membershipIdsForDesignations(
    organizationId: string,
    designationIds: readonly string[],
  ) {
    return this.repository.membershipIdsForDesignations(
      organizationId,
      designationIds,
    );
  }

  membershipIdsInDepartments(
    organizationId: string,
    departmentIds: readonly string[],
  ) {
    return this.repository.membershipIdsInDepartments(
      organizationId,
      departmentIds,
    );
  }

  membershipIdsWithResourceAccess(
    organizationId: string,
    scopeType: 'CLIENT' | 'PROJECT',
    resourceIds: readonly string[],
  ) {
    return this.repository.membershipIdsWithResourceAccess(
      organizationId,
      scopeType,
      resourceIds,
    );
  }

  async assign(
    organizationId: string,
    actorId: string,
    membershipId: string,
    roleIds: readonly string[],
    scopes?: readonly RoleAssignmentScopeInput[],
  ): Promise<AccessRoleSummary[]> {
    const roles = await this.requireAssignableRoles(organizationId, roleIds);
    const before = await this.repository.rolesByMembership(organizationId, [
      membershipId,
    ]);
    await this.repository.replaceAssignments(
      organizationId,
      membershipId,
      roles.map((role) => role.id),
      scopes,
    );
    await this.authorization.invalidateCache(organizationId, membershipId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.roles_assign',
      entityType: MEMBERSHIP_ENTITY_TYPE,
      entityId: membershipId,
      before: {
        roles: (before.get(membershipId) ?? []).map((role) => role.name),
      },
      after: {
        roles: roles.map((role) => role.name),
        scopes: scopes ?? [{ scopeType: 'ORGANIZATION' }],
      },
    });
    return roles;
  }
}
