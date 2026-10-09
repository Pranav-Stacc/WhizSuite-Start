'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { groupsForRole, isActivePath } from '@/shared/navigation/nav-config';

/** Client workspaces render their own section tabs, so module tabs step aside there. */
const CLIENT_WORKSPACE = /^\/clients\/[^/]+/;

/** Second bar: the sibling pages of whichever module you are in, so any related screen is one click away. */
export function ModuleTabs({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const pathname = usePathname();
  if (CLIENT_WORKSPACE.test(pathname)) return null;
  const group = groupsForRole(role).find((g) => g.items.some((item) => isActivePath(pathname, item.href)));
  if (!group || group.items.length < 2) return null;

  return (
    <nav aria-label={t(group.label)} className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-3">
      <p className="eyebrow">{t(group.label)}</p>
      <ul className="no-scrollbar flex gap-5 overflow-x-auto">
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
