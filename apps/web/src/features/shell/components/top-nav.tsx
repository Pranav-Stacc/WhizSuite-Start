'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { NavigationMenu } from 'radix-ui';
import type { UserRole } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { HOME_ITEM, activeGroupId, groupsForRole, isActivePath } from '@/shared/navigation/nav-config';

const triggerClass =
  'group inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-surface-2 data-[state=open]:text-foreground [&_svg.lead]:size-4';

/** Mega-menu top navigation — replaces the classic sidebar. Hover, click or arrow-key to open. */
export function TopNav({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const pathname = usePathname();
  const activeId = activeGroupId(pathname);
  const groups = groupsForRole(role);
  const HomeIcon = HOME_ITEM.icon;
  const homeActive = isActivePath(pathname, HOME_ITEM.href);

  return (
    <NavigationMenu.Root delayDuration={60} skipDelayDuration={250} aria-label={t('shell.menu')} className="relative z-50 hidden lg:block">
      <NavigationMenu.List className="flex items-center gap-0.5">
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild active={homeActive}>
            <Link href={HOME_ITEM.href} className={cn(triggerClass, homeActive && 'bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary')}>
              <HomeIcon className="lead" />
              {t(HOME_ITEM.label)}
            </Link>
          </NavigationMenu.Link>
        </NavigationMenu.Item>

        {groups.map((group) => {
          const active = group.id === activeId;
          const GroupIcon = group.icon;
          const groupBadge = group.items.reduce((acc, item) => acc + (badges[item.href] ?? 0), 0);
          return (
            <NavigationMenu.Item key={group.id}>
              <NavigationMenu.Trigger className={cn(triggerClass, active && 'bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary')}>
                <GroupIcon className="lead" />
                <span className="hidden xl:inline">{t(group.label)}</span>
                {groupBadge > 0 ? <span className="grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-contrast">{groupBadge}</span> : null}
                <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content className="w-[min(92vw,520px)] p-2.5 data-[motion=from-end]:animate-fade-in data-[motion=from-start]:animate-fade-in">
                <div className="px-3 pb-2 pt-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t(group.label)}</p>
                  <p className="text-[13px] text-muted">{t(group.desc)}</p>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const itemActive = isActivePath(pathname, item.href);
                    const badge = badges[item.href];
                    return (
                      <li key={item.href}>
                        <NavigationMenu.Link asChild active={itemActive}>
                          <Link
                            href={item.href}
                            className={cn('flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-primary/10', itemActive && 'bg-primary/10')}
                          >
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-medium">
                                {t(item.label)}
                                {badge ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-contrast">{badge}</span> : null}
                              </span>
                              <span className="block truncate text-xs text-muted">{t(item.desc)}</span>
                            </span>
                          </Link>
                        </NavigationMenu.Link>
                      </li>
                    );
                  })}
                </ul>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          );
        })}
      </NavigationMenu.List>

      <div className="absolute left-0 top-full flex justify-start">
        <NavigationMenu.Viewport className="relative h-(--radix-navigation-menu-viewport-height) w-(--radix-navigation-menu-viewport-width) origin-top-left overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur-xl transition-[width,height] duration-200 data-[state=closed]:animate-fade-in" />
      </div>
    </NavigationMenu.Root>
  );
}
