import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  type MemberAccess,
  type MemberDesignationSummary,
  type MemberPermissionOverride,
  type RoleAssignmentScopeInput,
} from '@agency-os/contracts';
import { problem } from '../../../../shared/errors/problem-details.exception';
import {
  AccessRepository,
  toOverrides,
} from '../../../access/infrastructure/repositories/access.repository';
import { AuthorizationService } from '../../../access/application/services/authorization.service';
import { DefaultRolesService } from '../../../access/application/services/default-roles.service';
import { RoleAssignmentService } from '../../../access/application/services/role-assignment.service';
import {
  applyPermissionOverrides,
  sortOverrides,
} from '../../../access/application/utils/effective-permissions';
import {
  CLIENT_MEMBERSHIP_TYPE,
  STAFF_MEMBERSHIP_TYPES,
  type StaffMembershipType,
} from '../../../access/config/default-roles';
import { AuditService } from '../../../audit/application/services/audit.service';
import { TenancyService } from '../../../tenancy/application/services/tenancy.service';
import { IdentityRepository } from '../../infrastructure/repositories/identity.repository';

const MEMBER_ENTITY_TYPE = 'membership';

function isStaff(type: string): type is StaffMembershipType {
  return STAFF_MEMBERSHIP_TYPES.some((t) => t === type);
}

@Injectable()
export class MembersService {
  constructor(
    private readonly identity: IdentityRepository,
    private readonly access: AccessRepository,
    private readonly tenancy: TenancyService,
    private readonly defaultRoles: DefaultRolesService,
    private readonly authorization: AuthorizationService,
    private readonly roleAssignment: RoleAssignmentService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    const [rows, rolesByMembership, placements, overrideCounts] =
      await Promise.all([
        this.identity.listOrganizationMembers(organizationId),
        this.roleAssignment.rolesByMembership(organizationId),
        this.access.designationsByMembership(organizationId),
        this.access.overrideCountsByMembership(organizationId),
      ]);

    const designationIds = [
      ...new Set(
        [...placements.values()].flatMap((list) =>
          list.map((item) => item.designationId),
        ),
      ),
    ];
    const designationRefs = await this.tenancy.designationsByIds(
      organizationId,
      designationIds,
    );

    return rows.map(({ membership, user }) => ({
      id: user.id,
      membershipId: membership.id,
      email: user.email,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      avatarUrl: user.avatarUrl,
      title: user.jobTitle,
      membershipType: membership.type,
      employmentType: membership.employmentType,
      status: membership.status,
      roles: rolesByMembership.get(membership.id) ?? [],
      designations: this.toDesignationSummaries(
        placements.get(membership.id) ?? [],
        designationRefs,
      ),
      overrideCount: overrideCounts.get(membership.id) ?? 0,
      createdAt: membership.createdAt,
    }));
  }

  async setDesignations(
    organizationId: string,
    actorId: string,
    userId: string,
    designationIds: readonly string[],
    primaryId?: string | null,
  ) {
    const membership = await this.requireActiveNonClient(
      organizationId,
      userId,
    );
    const uniqueIds = [...new Set(designationIds)];
    const refs = await this.tenancy.designationsByIds(
      organizationId,
      uniqueIds,
    );
    if (refs.size !== uniqueIds.length) {
      const missing = uniqueIds.filter((id) => !refs.has(id));
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Unknown designations',
        ErrorCodes.VALIDATION_FAILED,
        `Unknown designation ids: ${missing.join(', ')}`,
      );
    }
    const primary =
      primaryId && uniqueIds.includes(primaryId)
        ? primaryId
        : (uniqueIds[0] ?? null);
    const before = await this.access.designationsByMembership(organizationId);
    const beforeIds = (before.get(membership.id) ?? []).map(
      (row) => row.designationId,
    );

    await this.access.replaceMembershipDesignations(
      organizationId,
      membership.id,
      uniqueIds.map((id) => ({
        designationId: id,
        isPrimary: id === primary,
      })),
    );

    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.designations_set',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      before: { designationIds: beforeIds },
      after: { designationIds: uniqueIds, primaryId: primary },
    });

    return {
      designations: this.toDesignationSummaries(
        uniqueIds.map((id) => ({
          designationId: id,
          isPrimary: id === primary,
        })),
        refs,
      ),
    };
  }

  async updateProfile(
    organizationId: string,
    actorId: string,
    userId: string,
    title: string | null,
  ) {
    await this.requireActiveNonClient(organizationId, userId);
    const before = await this.identity.findProfile(userId);
    if (!before) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    const after = await this.identity.updateProfile(userId, {
      jobTitle: title,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.profile_update',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: userId,
      before: { title: before.jobTitle },
      after: { title: after.jobTitle },
    });
    return { id: userId, title: after.jobTitle };
  }

  async getAccess(
    organizationId: string,
    userId: string,
  ): Promise<MemberAccess> {
    const membership = await this.identity.findMembershipOfUser(
      organizationId,
      userId,
    );
    if (!membership) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    return this.buildAccess(organizationId, membership.id);
  }

  async setPermissions(
    organizationId: string,
    actorId: string,
    userId: string,
    overrides: readonly MemberPermissionOverride[],
  ): Promise<MemberAccess> {
    const membership = await this.requireManageable(
      organizationId,
      actorId,
      userId,
    );
    const before = sortOverrides(
      await this.loadOverrides(organizationId, membership.id),
    );
    const keys = overrides.map((row) => row.key);
    const permissions = await this.access.findPermissionsByKeys(keys);
    if (permissions.length !== keys.length) {
      const found = new Set(permissions.map((p) => p.key));
      const missing = keys.filter((key) => !found.has(key));
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Unknown permissions',
        ErrorCodes.VALIDATION_FAILED,
        `Unknown permission keys: ${missing.join(', ')}`,
      );
    }
    const byKey = new Map(permissions.map((p) => [p.key, p.id]));
    await this.access.replaceMemberOverrides(
      organizationId,
      membership.id,
      actorId,
      overrides.map((row) => ({
        permissionId: byKey.get(row.key)!,
        effect: row.effect,
      })),
    );
    await this.authorization.invalidateCache(organizationId, membership.id);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.permissions_set',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      before: { overrides: before },
      after: { overrides: sortOverrides(overrides) },
    });
    return this.buildAccess(organizationId, membership.id);
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

  async updateEmployment(
    organizationId: string,
    actorId: string,
    userId: string,
    employmentType: string | null,
  ) {
    const membership = await this.requireActiveNonClient(organizationId, userId);
    const updated = await this.access.updateEmploymentType(
      organizationId,
      membership.id,
      employmentType,
    );
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.employment_update',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      before: { employmentType: membership.employmentType },
      after: { employmentType: updated.employmentType },
    });
    return { id: userId, employmentType: updated.employmentType };
  }

  async listDocuments(organizationId: string, userId: string) {
    const membership = await this.identity.findMembershipOfUser(organizationId, userId);
    if (!membership) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    const rows = await this.access.listMemberDocuments(organizationId, membership.id);
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      templateId: row.templateId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async sendDocument(
    organizationId: string,
    actorId: string,
    userId: string,
    input: { type: string; title: string; templateId?: string | null },
  ) {
    const membership = await this.requireActiveNonClient(organizationId, userId);
    const row = await this.access.createMemberDocument({
      organizationId,
      membershipId: membership.id,
      type: input.type,
      title: input.title.trim(),
      templateId: input.templateId ?? null,
      status: 'SENT',
      createdBy: actorId,
    });
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'membership.document_sent',
      entityType: MEMBER_ENTITY_TYPE,
      entityId: membership.id,
      after: { documentId: row.id, type: row.type, title: row.title },
    });
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      templateId: row.templateId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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

  private async buildAccess(
    organizationId: string,
    membershipId: string,
  ): Promise<MemberAccess> {
    const [rolesByMembership, inputs] = await Promise.all([
      this.roleAssignment.rolesByMembership(organizationId, [membershipId]),
      this.access.loadPermissionInputs(organizationId, membershipId),
    ]);
    return {
      roles: rolesByMembership.get(membershipId) ?? [],
      overrides: sortOverrides(inputs.overrides),
      effectivePermissions: applyPermissionOverrides(inputs),
    };
  }

  private async loadOverrides(
    organizationId: string,
    membershipId: string,
  ): Promise<MemberPermissionOverride[]> {
    return toOverrides(
      await this.access.listMemberOverrides(organizationId, membershipId),
    );
  }

  private toDesignationSummaries(
    placements: ReadonlyArray<{ designationId: string; isPrimary: boolean }>,
    refs: Map<
      string,
      {
        id: string;
        name: string;
        isHead: boolean;
        departmentId: string;
        departmentName: string;
      }
    >,
  ): MemberDesignationSummary[] {
    const rows: MemberDesignationSummary[] = [];
    for (const placement of placements) {
      const ref = refs.get(placement.designationId);
      if (!ref) continue;
      rows.push({
        id: ref.id,
        name: ref.name,
        departmentId: ref.departmentId,
        departmentName: ref.departmentName,
        isHead: ref.isHead,
        isPrimary: placement.isPrimary,
      });
    }
    return rows.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.departmentName.localeCompare(b.departmentName);
    });
  }

  /** Active non-CLIENT membership — self and OWNER are allowed. */
  private async requireActiveNonClient(organizationId: string, userId: string) {
    const membership = await this.identity.findMembershipOfUser(
      organizationId,
      userId,
    );
    if (!membership) {
      throw problem(HttpStatus.NOT_FOUND, 'Not Found', ErrorCodes.NOT_FOUND);
    }
    if (membership.type === CLIENT_MEMBERSHIP_TYPE) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Membership cannot be changed',
        ErrorCodes.VALIDATION_FAILED,
        'CLIENT memberships cannot hold department positions',
      );
    }
    return membership;
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
