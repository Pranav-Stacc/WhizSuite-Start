import Link from 'next/link';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import type { MediaFolderDto } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';

export type FolderNode = MediaFolderDto & { children: FolderNode[] };

/** Builds a nested tree from a flat folder list (parentId links). */
export function buildFolderTree(folders: MediaFolderDto[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const folder of folders) {
    byId.set(folder.id, { ...folder, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
}

/** Ancestor chain from root → current (inclusive), walking parentId. */
export function folderAncestors(
  folders: MediaFolderDto[],
  folderId: string | undefined,
): MediaFolderDto[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: MediaFolderDto[] = [];
  let current = byId.get(folderId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

interface FolderTreeProps {
  roots: FolderNode[];
  activeId?: string;
  hrefFor: (folderId: string | undefined) => string;
  className?: string;
}

/** Nested folder navigation for client asset libraries. */
export function FolderTree({ roots, activeId, hrefFor, className }: FolderTreeProps) {
  if (roots.length === 0) {
    return <p className="px-1 text-xs text-muted">{t('clients.assets.tree.empty')}</p>;
  }
  return (
    <nav aria-label={t('clients.assets.folders')} className={cn('space-y-0.5', className)}>
      <Link
        href={hrefFor(undefined)}
        className={cn(
          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] transition-colors hover:bg-surface-2',
          !activeId ? 'bg-surface-2 text-foreground' : 'text-muted',
        )}
      >
        <Folder className="size-3.5 shrink-0" aria-hidden />
        {t('clients.assets.all')}
      </Link>
      <ul className="space-y-0.5">
        {roots.map((node) => (
          <FolderTreeItem key={node.id} node={node} depth={0} activeId={activeId} hrefFor={hrefFor} />
        ))}
      </ul>
    </nav>
  );
}

function FolderTreeItem({
  node,
  depth,
  activeId,
  hrefFor,
}: {
  node: FolderNode;
  depth: number;
  activeId?: string;
  hrefFor: (folderId: string | undefined) => string;
}) {
  const active = activeId === node.id;
  const inBranch = active || isAncestorOf(node, activeId);
  const Icon = active || inBranch ? FolderOpen : Folder;
  return (
    <li>
      <Link
        href={hrefFor(node.id)}
        className={cn(
          'flex items-center gap-1.5 rounded-sm py-1.5 pr-2 text-[13px] transition-colors hover:bg-surface-2',
          active ? 'bg-surface-2 font-medium text-foreground' : 'text-muted hover:text-foreground',
        )}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
      >
        {node.children.length > 0 ? (
          <ChevronRight
            className={cn('size-3 shrink-0 text-muted transition-transform', inBranch && 'rotate-90')}
            aria-hidden
          />
        ) : (
          <span className="inline-block size-3 shrink-0" aria-hidden />
        )}
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.children.length > 0 ? (
          <span className="tabular-nums text-[10px] text-muted">{node.children.length}</span>
        ) : null}
      </Link>
      {inBranch && node.children.length > 0 ? (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <FolderTreeItem key={child.id} node={child} depth={depth + 1} activeId={activeId} hrefFor={hrefFor} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function isAncestorOf(node: FolderNode, targetId: string | undefined): boolean {
  if (!targetId) return false;
  for (const child of node.children) {
    if (child.id === targetId || isAncestorOf(child, targetId)) return true;
  }
  return false;
}
