import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssignableScopeTypes,
  ErrorCodes,
  roleInputSchema,
  type RoleInput,
  type RoleKind,
  type ScopeType,
} from '@agency-os/contracts';
import {
  notFound,
  problem,
} from '../../../../shared/errors/problem-details.exception';
import { AuditService } from '../../../audit/application/services/audit.service';
import { AccessRepository } from '../../infrastructure/repositories/access.repository';
import { AuthorizationService } from './authorization.service';

const ROLE_ENTITY_TYPE = 'role';

function asScopeTypes(value: unknown): ScopeType[] {
  if (!Array.isArray(value)) return [AssignableScopeTypes.ORGANIZATION];
  const scopes = value.filter(
    (entry): entry is ScopeType => typeof entry === 'string',
  );
  return scopes.length > 0 ? scopes : [AssignableScopeTypes.ORGANIZATION];
}

function parseRoleInput(input: unknown): RoleInput {
  const parsed = roleInputSchema.safeParse(input);
  if (!parsed.success) {
    throw problem(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Invalid role',
      ErrorCodes.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? 'Role input failed validation',
    );
  }
  return parsed.data;
}

/** Custom and system roles are editable; only custom roles may be deleted. */
@Injectable()
export class RolesService {
  constructor(
    private readonly repository: AccessRepository,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string, kind?: RoleKind) {
    return this.repository.listRoles(organizationId, kind);
  }

  async create(organizationId: string, actorId: string, raw: unknown) {
    const input = parseRoleInput(raw);
    const role = await this.repository.createRole(organizationId, input);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'role.create',
      entityType: ROLE_ENTITY_TYPE,
      entityId: role.id,
      after: {
        name: role.name,
        kind: input.kind,
        permissionKeys: input.permissionKeys,
        defaultScopeTypes: input.defaultScopeTypes,
      },
    });
    return role;
  }

  async update(
    organizationId: string,
    actorId: string,
    roleId: string,
    raw: Partial<RoleInput>,
  ) {
    const before = await this.requireCustomRole(organizationId, roleId);
    // Validate the post-update shape so ACCESS roles cannot lose all permissions.
    parseRoleInput({
      name: raw.name ?? before.name,
      description: raw.description !== undefined ? raw.description : undefined,
      kind: raw.kind ?? before.kind,
      permissionKeys:
        raw.permissionKeys ?? before.permissions.map((p) => p.permission.key),
      defaultScopeTypes:
        raw.defaultScopeTypes ?? asScopeTypes(before.defaultScopeTypes),
    });
    const patch: Partial<RoleInput> = {};
    if (raw.name !== undefined) patch.name = raw.name;
    if (raw.description !== undefined) patch.description = raw.description;
    if (raw.kind !== undefined) patch.kind = raw.kind;
    if (raw.permissionKeys !== undefined) {
      patch.permissionKeys = raw.permissionKeys;
    }
    if (raw.defaultScopeTypes !== undefined) {
      patch.defaultScopeTypes = raw.defaultScopeTypes;
    }
    const role = await this.repository.updateRole(
      organizationId,
      roleId,
      patch,
    );
    if (!role) throw notFound();
    if (patch.permissionKeys || patch.kind) {
      await this.authorization.invalidateOrganization(organizationId);
    }
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'role.update',
      entityType: ROLE_ENTITY_TYPE,
      entityId: roleId,
      before: {
        name: before.name,
        kind: before.kind,
        permissionKeys: before.permissions.map((p) => p.permission.key),
        defaultScopeTypes: before.defaultScopeTypes,
      },
      after: { name: role.name, ...patch },
    });
    return role;
  }

  /** Refuses while members still hold the role so nobody silently loses access. */
  async remove(organizationId: string, actorId: string, roleId: string) {
    const role = await this.requireCustomRole(organizationId, roleId);
    if (role._count.assignments > 0) {
      throw problem(
        HttpStatus.CONFLICT,
        'Role is in use',
        ErrorCodes.CONFLICT,
        `${role._count.assignments} member(s) still hold this role`,
      );
    }
    await this.repository.deleteRole(organizationId, roleId);
    await this.audit.record({
      organizationId,
      actorId,
      actorType: 'user',
      action: 'role.delete',
      entityType: ROLE_ENTITY_TYPE,
      entityId: roleId,
      before: {
        name: role.name,
        kind: role.kind,
        permissionKeys: role.permissions.map((p) => p.permission.key),
        defaultScopeTypes: role.defaultScopeTypes,
      },
    });
  }

  private async requireRole(organizationId: string, roleId: string) {
    const role = await this.repository.findRole(organizationId, roleId);
    if (!role) throw notFound();
    return role;
  }

  private async requireCustomRole(organizationId: string, roleId: string) {
    const role = await this.requireRole(organizationId, roleId);
    if (role.isSystem) {
      throw problem(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'System roles cannot be deleted',
        ErrorCodes.VALIDATION_FAILED,
        'Remove assignments before replacing this role with a custom one',
      );
    }
    return role;
  }
}
