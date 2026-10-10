import { ScopeTypes } from '@agency-os/contracts';
import type { PrismaService } from '../../../../shared/database/prisma.service';
import { resolveDataScopeFromAssignments } from './resolve-data-scope';

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
