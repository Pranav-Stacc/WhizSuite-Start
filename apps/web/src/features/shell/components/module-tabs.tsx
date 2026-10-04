'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { groupsForRole, isActivePath } from '@/shared/navigation/nav-config';

/** Second bar: the sibling pages of whichever module you are in, so any related screen is one click away. */
export function ModuleTabs({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const pathname = usePathname();
  const group = groupsForRole(role).find((g) => g.items.some((item) => isActivePath(pathname, item.href)));
  if (!group || group.items.length < 2) return null;

  return (
    <nav aria-label={t(group.label)} className="border-t border-border-soft/60">
      <ul className="no-scrollbar mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
        {group.items.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          const badge = badges[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-all',
                  active ? 'bg-primary/16 text-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)]' : 'text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                <Icon className="size-3.5" />
                {t(item.label)}
                {badge ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-contrast">{badge}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
