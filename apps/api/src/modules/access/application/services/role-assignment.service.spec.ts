import {
  DEFAULT_MEMBERSHIP_ROLES,
  ErrorCodes,
  RoleKinds,
  ScopeTypes,
} from '@agency-os/contracts';
import { ProblemDetailsException } from '../../../../shared/errors/problem-details.exception';
import type { AuditService } from '../../../audit/application/services/audit.service';
import type { AccessRepository } from '../../infrastructure/repositories/access.repository';
import type { AuthorizationService } from './authorization.service';
import { RoleAssignmentService } from './role-assignment.service';

const ORG = '00000000-0000-4000-8000-000000000001';
const ACTOR = '00000000-0000-4000-8000-000000000002';
const MEMBERSHIP = '00000000-0000-4000-8000-000000000003';
const ORG_SCOPES = [ScopeTypes.ORGANIZATION] as const;
const ROLE_MANAGER = {
  id: 'role-manager',
  name: DEFAULT_MEMBERSHIP_ROLES.ADMIN.name,
  isSystem: true,
  kind: RoleKinds.ACCESS,
  defaultScopeTypes: [...ORG_SCOPES],
};
const ROLE_CUSTOM = {
  id: 'role-custom',
  name: 'Strategist',
  isSystem: false,
  kind: RoleKinds.ACCESS,
  defaultScopeTypes: [...ORG_SCOPES],
};
const ROLE_OWNER = {
  id: 'role-owner',
  name: DEFAULT_MEMBERSHIP_ROLES.OWNER.name,
  isSystem: true,
  kind: RoleKinds.ACCESS,
  defaultScopeTypes: [...ORG_SCOPES],
};

function setup() {
  const repository = {
    findRoles: jest.fn(),
    rolesByMembership: jest.fn(),
    replaceAssignments: jest.fn().mockResolvedValue(undefined),
  };
  const authorization = {
    invalidateCache: jest.fn().mockResolvedValue(undefined),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new RoleAssignmentService(
    repository as unknown as AccessRepository,
    authorization as unknown as AuthorizationService,
    audit as unknown as AuditService,
  );
  return { service, repository, authorization, audit };
}

describe('RoleAssignmentService', () => {
  it('rejects role ids that are missing from the organisation', async () => {
    const { service, repository } = setup();
    repository.findRoles.mockResolvedValue([ROLE_CUSTOM]);

    let thrown: unknown;
    try {
      await service.requireAssignableRoles(ORG, [ROLE_CUSTOM.id, 'missing']);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ProblemDetailsException);
    const body = (thrown as ProblemDetailsException).getResponse();
    expect(body).toEqual(
      expect.objectContaining({ code: ErrorCodes.VALIDATION_FAILED }),
    );
    expect(repository.findRoles).toHaveBeenCalledWith(ORG, [
      ROLE_CUSTOM.id,
      'missing',
    ]);
  });

  it('rejects assigning the owner system role', async () => {
    const { service, repository } = setup();
    repository.findRoles.mockResolvedValue([ROLE_OWNER]);

    await expect(
      service.requireAssignableRoles(ORG, [ROLE_OWNER.id]),
    ).rejects.toBeInstanceOf(ProblemDetailsException);
  });

  it('replaces membership roles and invalidates the permission cache', async () => {
    const { service, repository, authorization, audit } = setup();
    repository.findRoles.mockResolvedValue([ROLE_MANAGER, ROLE_CUSTOM]);
    repository.rolesByMembership.mockResolvedValue(
      new Map([[MEMBERSHIP, [ROLE_MANAGER]]]),
    );

    const result = await service.assign(ORG, ACTOR, MEMBERSHIP, [
      ROLE_MANAGER.id,
      ROLE_CUSTOM.id,
      ROLE_CUSTOM.id,
    ]);

    expect(result).toEqual([ROLE_MANAGER, ROLE_CUSTOM]);
    expect(repository.replaceAssignments).toHaveBeenCalledWith(
      ORG,
      MEMBERSHIP,
      [ROLE_MANAGER.id, ROLE_CUSTOM.id],
      undefined,
    );
    expect(authorization.invalidateCache).toHaveBeenCalledWith(ORG, MEMBERSHIP);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'membership.roles_assign',
        entityId: MEMBERSHIP,
        before: { roles: [ROLE_MANAGER.name] },
        after: {
          roles: [ROLE_MANAGER.name, ROLE_CUSTOM.name],
          scopes: [{ scopeType: 'ORGANIZATION' }],
        },
      }),
    );
  });

  it('filters stale and owner roles when resolving invitation role ids', async () => {
    const { service, repository } = setup();
    repository.findRoles.mockResolvedValue([ROLE_CUSTOM, ROLE_OWNER]);

    await expect(
      service.existingAssignableRoleIds(ORG, [
        ROLE_CUSTOM.id,
        ROLE_OWNER.id,
        'gone',
      ]),
    ).resolves.toEqual([ROLE_CUSTOM.id]);
  });
});
