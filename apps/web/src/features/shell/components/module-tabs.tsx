'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Permission } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { allowedGroups, isActivePath } from '@/shared/navigation/nav-config';
import type { WorkspaceModule } from '@/shared/workspace/modules';

/** Client workspaces render their own section tabs, so module tabs step aside there. */
const CLIENT_WORKSPACE = /^\/clients\/[^/]+/;

/** Second bar: the sibling pages of whichever module you are in, so any related screen is one click away. */
export function ModuleTabs({
  permissions,
  badges,
  module = 'main',
}: {
  permissions: Permission[];
  badges: Record<string, number>;
  module?: WorkspaceModule;
}) {
  const pathname = usePathname();
  if (CLIENT_WORKSPACE.test(pathname)) return null;
  const group = allowedGroups(new Set(permissions), module).find((g) =>
    g.items.some((item) => isActivePath(pathname, item.href)),
  );
  if (!group || group.items.length < 2) return null;

  return (
    <nav aria-label={t(group.label)} className="mb-6 flex flex-col gap-3 border-b border-border-soft pb-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="eyebrow shrink-0">{t(group.label)}</p>
      <ul className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 sm:gap-5">
        {group.items.map((item) => {
          const badge = badges[item.href];
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={isActivePath(pathname, item.href) ? 'page' : undefined} className="nav-link whitespace-nowrap">
                {t(item.label)}
                {badge ? <sup className="ml-0.5 text-[9px] tabular-nums text-foreground">{badge}</sup> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
