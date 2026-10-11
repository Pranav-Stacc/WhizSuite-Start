'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/cn';
import { ContentComposer, type ComposerAsset, type ComposerClient, type ComposerPost } from '../content-composer';

interface NewPostOptions {
  scheduledAt?: string;
  assetIds?: string[];
}

type DrawerTarget = { kind: 'edit'; postId: string } | ({ kind: 'new'; nonce: number } & NewPostOptions);

interface PlannerDrawerApi {
  openPost: (postId: string) => void;
  newPost: (options?: NewPostOptions) => void;
}

const PlannerDrawerContext = createContext<PlannerDrawerApi | null>(null);

function usePlannerDrawer(): PlannerDrawerApi {
  const api = useContext(PlannerDrawerContext);
  if (!api) throw new Error('usePlannerDrawer must be used inside <PlannerDrawerProvider>');
  return api;
}

/** Drawer API when rendered inside a planner, otherwise null (read-only previews such as the client portal). */
export function useOptionalPlannerDrawer(): PlannerDrawerApi | null {
  return useContext(PlannerDrawerContext);
}

interface PlannerDrawerProviderProps {
  clientId: string;
  clients: ComposerClient[];
  assets: ComposerAsset[];
  posts: ComposerPost[];
  /** Posts that may no longer be edited (published) open their detail page instead. */
  lockedPostIds: string[];
  uploadEnabled?: boolean;
  children: ReactNode;
}

/** One post-details drawer per planner page; any tile, cell or row can open it. */
export function PlannerDrawerProvider({ clientId, clients, assets, posts, lockedPostIds, uploadEnabled = true, children }: PlannerDrawerProviderProps) {
  const router = useRouter();
  const [target, setTarget] = useState<DrawerTarget | null>(null);
  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const locked = useMemo(() => new Set(lockedPostIds), [lockedPostIds]);

  const api = useMemo<PlannerDrawerApi>(
    () => ({
      openPost: (postId) => {
        if (locked.has(postId)) router.push(`/content/${postId}`);
        else setTarget({ kind: 'edit', postId });
      },
      newPost: (options) => setTarget({ kind: 'new', nonce: Date.now(), ...options }),
    }),
    [locked, router],
  );

  const post = target?.kind === 'edit' ? byId.get(target.postId) : undefined;
  const key = target ? (target.kind === 'edit' ? target.postId : `new-${target.nonce}`) : 'closed';

  return (
    <PlannerDrawerContext.Provider value={api}>
      {children}
      <ContentComposer
        key={key}
        clients={clients}
        assets={assets}
        post={post}
        defaultClientId={clientId}
        defaultScheduledAt={target?.kind === 'new' ? target.scheduledAt : undefined}
        defaultAssetIds={target?.kind === 'new' ? target.assetIds : undefined}
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        stayOnSave
        uploadEnabled={uploadEnabled}
        compact
      />
    </PlannerDrawerContext.Provider>
  );
}

interface OpenPostButtonProps {
  postId: string;
  className?: string;
  label?: string;
  children: ReactNode;
}

export function OpenPostButton({ postId, className, label, children }: OpenPostButtonProps) {
  const { openPost } = usePlannerDrawer();
  return (
    <button type="button" onClick={() => openPost(postId)} aria-label={label} className={cn('text-left', className)}>
      {children}
    </button>
  );
}

interface NewPostButtonProps {
  scheduledAt?: string;
  className?: string;
  label?: string;
  children: ReactNode;
}

export function NewPostButton({ scheduledAt, className, label, children }: NewPostButtonProps) {
  const { newPost } = usePlannerDrawer();
  return (
    <button type="button" onClick={() => newPost({ scheduledAt })} aria-label={label} className={className}>
      {children}
    </button>
  );
}

export { usePlannerDrawer };
