import {
  recomputeSubtreePaths,
  wouldCreateCycle,
  type DepartmentPathNode,
} from './department-paths';

const tree: DepartmentPathNode[] = [
  { id: 'a', parentId: null, name: 'Creative', path: 'Creative', depth: 0 },
  { id: 'b', parentId: 'a', name: 'Video', path: 'Creative/Video', depth: 1 },
  {
    id: 'c',
    parentId: 'b',
    name: 'Editors',
    path: 'Creative/Video/Editors',
    depth: 2,
  },
  { id: 'd', parentId: null, name: 'Ops', path: 'Ops', depth: 0 },
];

describe('wouldCreateCycle', () => {
  it('detects moving under self', () => {
    expect(wouldCreateCycle(tree, 'a', 'a')).toBe(true);
  });

  it('detects moving under a descendant', () => {
    expect(wouldCreateCycle(tree, 'a', 'c')).toBe(true);
  });

  it('allows moving under a sibling branch', () => {
    expect(wouldCreateCycle(tree, 'b', 'd')).toBe(false);
  });
});

describe('recomputeSubtreePaths', () => {
  it('renames a root and updates descendant paths', () => {
    const updates = recomputeSubtreePaths(tree, 'a', {
      name: 'Studio',
      parentId: null,
    });
    expect(updates).toEqual([
      { id: 'a', name: 'Studio', parentId: null, path: 'Studio', depth: 0 },
      { id: 'b', name: 'Video', parentId: 'a', path: 'Studio/Video', depth: 1 },
      {
        id: 'c',
        name: 'Editors',
        parentId: 'b',
        path: 'Studio/Video/Editors',
        depth: 2,
      },
    ]);
  });

  it('moves a subtree under another root', () => {
    const updates = recomputeSubtreePaths(tree, 'b', {
      name: 'Video',
      parentId: 'd',
    });
    expect(updates).toEqual([
      { id: 'b', name: 'Video', parentId: 'd', path: 'Ops/Video', depth: 1 },
      {
        id: 'c',
        name: 'Editors',
        parentId: 'b',
        path: 'Ops/Video/Editors',
        depth: 2,
      },
    ]);
  });
});
