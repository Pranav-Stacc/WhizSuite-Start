import { ScopeTypes } from '@agency-os/contracts';
import type { PrismaService } from '../../../../shared/database/prisma.service';
import { permissionPrefixForPath } from './permission-prefix';
import {
  resolveDataScopeFromAssignments,
  scopesApplicableToPermissions,
} from './resolve-data-scope';

function prismaMock(overrides: Partial<PrismaService> = {}): PrismaService {
  return {
    memberDesignation: { findMany: jest.fn().mockResolvedValue([]) },
    teamMember: { findMany: jest.fn().mockResolvedValue([]) },
    organizationMembership: { findMany: jest.fn().mockResolvedValue([]) },
    clientAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    task: { findMany: jest.fn().mockResolvedValue([]) },
    contentItem: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as unknown as PrismaService;
}

describe('resolveDataScopeFromAssignments', () => {
  it('returns org-wide when there are no assignments', async () => {
    const scope = await resolveDataScopeFromAssignments(
      prismaMock(),
      'org-1',
      'mem-1',
      [],
    );
    expect(scope).toEqual({
      orgWide: true,
      selfOnly: false,
      clientIds: [],
      projectIds: [],
      contentIds: [],
    });
  });

  it('returns self-only without treating it as org-wide', async () => {
    const scope = await resolveDataScopeFromAssignments(
      prismaMock(),
      'org-1',
      'mem-1',
      [{ scopes: [{ scopeType: ScopeTypes.SELF, resourceId: null }] }],
    );
    expect(scope).toEqual({
      orgWide: false,
      selfOnly: true,
      clientIds: [],
      projectIds: [],
      contentIds: [],
    });
  });

  it('unions explicit client and project scopes', async () => {
    const scope = await resolveDataScopeFromAssignments(
      prismaMock({
        project: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ clientId: 'client-from-project' }]),
        },
      } as unknown as Partial<PrismaService>),
      'org-1',
      'mem-1',
      [
        {
          scopes: [
            { scopeType: ScopeTypes.CLIENT, resourceId: 'client-a' },
            { scopeType: ScopeTypes.PROJECT, resourceId: 'project-a' },
          ],
        },
      ],
    );
    expect(scope.orgWide).toBe(false);
    expect(scope.selfOnly).toBe(false);
    expect(scope.clientIds).toEqual(['client-a', 'client-from-project']);
    expect(scope.projectIds).toEqual(['project-a']);
  });
});

describe('scopesApplicableToPermissions', () => {
  const scopes = [
    { scopeType: ScopeTypes.ORGANIZATION, resourceId: null },
    { scopeType: ScopeTypes.CLIENT, resourceId: 'client-a' },
  ];

  it('keeps only scopes the permission allows', () => {
    const applicable = scopesApplicableToPermissions(scopes, [
      { key: 'content.create', scopeTypes: [ScopeTypes.CLIENT] },
    ]);
    expect(applicable).toEqual([
      { scopeType: ScopeTypes.CLIENT, resourceId: 'client-a' },
    ]);
  });

  it('ignores other modules when a prefix is set', () => {
    const applicable = scopesApplicableToPermissions(
      scopes,
      [
        { key: 'content.view', scopeTypes: [ScopeTypes.CLIENT] },
        { key: 'projects.view', scopeTypes: [ScopeTypes.ORGANIZATION] },
      ],
      ['projects'],
    );
    expect(applicable).toEqual([
      { scopeType: ScopeTypes.ORGANIZATION, resourceId: null },
    ]);
  });

  it('treats a missing scope list as every assignment scope', () => {
    const applicable = scopesApplicableToPermissions(scopes, [
      { key: 'content.view', scopeTypes: null },
    ]);
    expect(applicable).toEqual(scopes);
  });
});

describe('permissionPrefixForPath', () => {
  it('maps content and media routes to their permission modules', () => {
    expect(
      permissionPrefixForPath('/v1/organizations/org/content/abc?status=DRAFT'),
    ).toBe('content');
    expect(permissionPrefixForPath('/v1/organizations/org/media/assets')).toBe(
      'files',
    );
    expect(permissionPrefixForPath('/v1/organizations/org/projects')).toBe(
      'projects',
    );
    expect(permissionPrefixForPath('/v1/access/capabilities')).toBeUndefined();
  });
});
