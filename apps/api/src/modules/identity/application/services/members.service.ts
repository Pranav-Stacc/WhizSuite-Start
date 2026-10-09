import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  type RoleAssignmentScopeInput,
} from '@agency-os/contracts';
import { problem } from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AuthorizationService } from '../../../access/application/services/authorization.service';
import { DefaultRolesService } from '../../../access/application/services/default-roles.service';
import { RoleAssignmentService } from '../../../access/application/services/role-assignment.service';
import {
  STAFF_MEMBERSHIP_TYPES,
  type StaffMembershipType,
} from '../../../access/config/default-roles';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';

const MEMBER_ENTITY_TYPE = 'membership';

function isStaff(type: string): type is StaffMembershipType {
  return STAFF_MEMBERSHIP_TYPES.some((t) => t === type);
}

@Injectable()
export class MembersService {
  constructor(
    private readonly identity: IdentityRepository,
    private readonly defaultRoles: DefaultRolesService,
    private readonly authorization: AuthorizationService,
    private readonly roleAssignment: RoleAssignmentService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    const [rows, rolesByMembership] = await Promise.all([
      this.identity.listOrganizationMembers(organizationId),
      this.roleAssignment.rolesByMembership(organizationId),
    ]);
    return rows.map(({ membership, user }) => ({
      id: user.id,
      membershipId: membership.id,
      email: user.email,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatarUrl: user.avatarUrl,
      title: user.jobTitle,
      membershipType: membership.type,
      status: membership.status,
      roles: rolesByMembership.get(membership.id) ?? [],
      createdAt: membership.createdAt,
    }));
  }

  async assignRoles(
    organizationId: string,
    actorId: string,
    userId: string,
    roleIds: readonly string[],
    scopes?: readonly RoleAssignmentScopeInput[],
  ) {
    const membership = await this.requireManageable(
      organizationId,
      actorId,
      userId,
    );
    const roles = await this.roleAssignment.assign(
      organizationId,
      actorId,
      membership.id,
      roleIds,
      scopes,
    );
    return { id: userId, membershipId: membership.id, roles };
  }

  async changeType(
    organizationId: string,
    actorId: string,
    userId: string,
    membershipType: StaffMembershipType,
  ) {
    const membership = await this.requireManageable(
      organizationId,
      actorId,
      userId,
    );
    const roleId = await this.defaultRoles.roleIdFor(
      organizationId,
      membershipType,
    );
    const updated = await this.identity.changeMembershipType(
      organizationId,
      membership.id,
      membershipType,
      roleId,
    );
    await this.authorization.invalidateCache(organizationId, membership.id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.role_change',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      before: { membershipType: membership.type },
      after: { membershipType },
    });
    return {
      id: userId,
      membershipId: updated.id,
      membershipType: updated.type,
    };
  }

  async deactivate(organizationId: string, actorId: string, userId: string) {
    const membership = await this.requireManageable(
      organizationId,
      actorId,
      userId,
    );
    await this.identity.deactivateMembership(organizationId, membership.id);
    await this.authorization.invalidateCache(organizationId, membership.id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.deactivate',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      before: { userId, membershipType: membership.type },
    });
  }

  /** Owners, client users and the caller themselves are never changed from the team screen. */
  private async requireManageable(
    organizationId: string,
    actorId: string,
    userId: string,
  ) {
    if (userId === actorId)
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Cannot change your own membership',
        ErrorCodes.VALIDATION_FAILED,
      );
    const membership = await this.identity.findMembershipOfUser(
      organizationId,
      userId,
    );
    if (!membership)
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    if (!isStaff(membership.type))
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Membership cannot be changed',
        ErrorCodes.VALIDATION_FAILED,
        `${membership.type} memberships are managed elsewhere`,
      );
    return membership;
  }
}
