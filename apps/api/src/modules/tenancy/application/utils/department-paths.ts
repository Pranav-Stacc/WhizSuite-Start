import { DEPARTMENT_PATH_SEPARATOR } from '@agency-os/contracts';

export interface DepartmentPathNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  depth: number;
}

/** True when `candidateParentId` is `departmentId` or one of its descendants. */
export function wouldCreateCycle(
  departments: readonly DepartmentPathNode[],
  departmentId: string,
  candidateParentId: string,
): boolean {
  if (candidateParentId === departmentId) return true;
  const childrenOf = new Map<string | null, string[]>();
  for (const department of departments) {
    const list = childrenOf.get(department.parentId) ?? [];
    list.push(department.id);
    childrenOf.set(department.parentId, list);
  }
  const stack = [...(childrenOf.get(departmentId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === candidateParentId) return true;
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return false;
}

/**
 * Recomputes path and depth for `rootId` and every descendant after a rename/move.
 * Child `parentId` values stay unchanged; only the root's parent/name change.
 */
export function recomputeSubtreePaths(
  departments: readonly DepartmentPathNode[],
  rootId: string,
  next: { name: string; parentId: string | null },
): Array<{
  id: string;
  path: string;
  depth: number;
  parentId: string | null;
  name: string;
}> {
  const byId = new Map(departments.map((d) => [d.id, d]));
  const childrenOf = new Map<string | null, string[]>();
  for (const department of departments) {
    const list = childrenOf.get(department.parentId) ?? [];
    list.push(department.id);
    childrenOf.set(department.parentId, list);
  }

  let parentPath = '';
  let parentDepth = -1;
  if (next.parentId) {
    const parent = byId.get(next.parentId);
    if (!parent) throw new Error('Parent department not found');
    parentPath = parent.path;
    parentDepth = parent.depth;
  }

  const updates: Array<{
    id: string;
    path: string;
    depth: number;
    parentId: string | null;
    name: string;
  }> = [];

  const walk = (
    id: string,
    name: string,
    parentId: string | null,
    path: string,
    depth: number,
  ) => {
    updates.push({ id, name, parentId, path, depth });
    for (const childId of childrenOf.get(id) ?? []) {
      const child = byId.get(childId);
      if (!child) continue;
      const childPath = `${path}${DEPARTMENT_PATH_SEPARATOR}${child.name}`;
      walk(childId, child.name, id, childPath, depth + 1);
    }
  };

  const rootPath = parentPath
    ? `${parentPath}${DEPARTMENT_PATH_SEPARATOR}${next.name}`
    : next.name;
  walk(rootId, next.name, next.parentId, rootPath, parentDepth + 1);
  return updates;
}
