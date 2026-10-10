'use client';

import Link from 'next/link';
import { useTransition, type ComponentProps, type MouseEvent, type ReactNode } from 'react';
import { publicEnv } from '@/shared/config/public-env';
import { workspaceHref } from '@/shared/workspace/host';
import { moduleForPath, type WorkspaceModule } from '@/shared/workspace/modules';
import { prepareWorkspaceHopAction } from '@/features/shell/actions/workspace.actions';

type LinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  /** Current product surface the user is browsing. */
  currentModule: WorkspaceModule;
  orgSlug?: string;
  children: ReactNode;
};

/**
 * Same-module paths use soft Next.js navigation.
 * Cross-module paths (e.g. /time on Finance) hard-navigate to the correct subdomain
 * so RSC prefetches never hit a CORS-breaking redirect.
 */
export function ModuleLink({ href, currentModule, orgSlug, children, onClick, ...rest }: LinkProps) {
  const [pending, start] = useTransition();
  const root = publicEnv.appRootDomain;
  const targetModule = moduleForPath(href.split('?')[0] ?? href);
  const crossModule = Boolean(root && orgSlug && targetModule !== currentModule);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !crossModule || !orgSlug || !root) return;
    event.preventDefault();
    const path = href.startsWith('/') ? href : `/${href}`;
    start(async () => {
      await prepareWorkspaceHopAction();
      window.location.href = workspaceHref({ module: targetModule, orgSlug, rootDomain: root, path });
    });
  };

  return (
    <Link href={href} onClick={handleClick} aria-busy={pending || undefined} {...rest}>
      {children}
    </Link>
  );
}
