import {
  projectMatchesScope,
  taskListWhere,
  taskMatchesScope,
} from './scope-filters';

describe('scope-filters', () => {
  const selfScope = {
    selfOnly: true,
    membershipId: 'mem-1',
    userId: 'user-1',
  };

  it('matches tasks created by or assigned to the actor under self scope', () => {
    expect(
      taskMatchesScope(
        {
          clientId: null,
          projectId: null,
          createdById: 'user-1',
          assignees: [],
        },
        selfScope,
      ),
    ).toBe(true);
    expect(
      taskMatchesScope(
        {
          clientId: null,
          projectId: null,
          createdById: 'other',
          assignees: [{ membershipId: 'mem-1' }],
        },
        selfScope,
      ),
    ).toBe(true);
    expect(
      taskMatchesScope(
        {
          clientId: null,
          projectId: null,
          createdById: 'other',
          assignees: [{ membershipId: 'mem-2' }],
        },
        selfScope,
      ),
    ).toBe(false);
  });

  it('narrows task lists by client scope', () => {
    const where = taskListWhere(
      { organizationId: 'org-1', deletedAt: null },
      { clientIds: ['client-a'] },
    );
    expect(where).toEqual({
      AND: [
        { organizationId: 'org-1', deletedAt: null },
        {
          OR: [
            { clientId: { in: ['client-a'] } },
            {
              project: {
                clientId: { in: ['client-a'] },
                deletedAt: null,
              },
            },
          ],
        },
      ],
    });
  });

  it('narrows projects to owned records under self scope', () => {
    expect(
      projectMatchesScope(
        { id: 'p1', clientId: 'c1', ownerId: 'user-1' },
        { selfOnly: true, userId: 'user-1' },
      ),
    ).toBe(true);
    expect(
      projectMatchesScope(
        { id: 'p1', clientId: 'c1', ownerId: 'user-2' },
        { selfOnly: true, userId: 'user-1' },
      ),
    ).toBe(false);
  });
});
