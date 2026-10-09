'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutGrid, Menu as MenuIcon } from 'lucide-react';
import type { Permission } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { HOME_ITEM, allowedGroups, isActivePath } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/overlays';

const OPEN_EVENT = 'open-mobile-menu';
const DOCK_HREFS = ['/dashboard', '/tasks', '/content', '/approvals'];

type Badges = Record<string, number>;

/** Hamburger + full menu sheet used below the `lg` breakpoint. Also opened by the bottom dock's "More". */
export function MobileMenu({ permissions, badges }: { permissions: Permission[]; badges: Badges }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = allowedGroups(new Set(permissions));
  const HomeIcon = HOME_ITEM.icon;

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('shell.menu')} onClick={() => setOpen(true)}>
        <MenuIcon />
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t('shell.menu')} width="max-w-sm">
        <nav className="space-y-6" aria-label={t('shell.menu')}>
          <Link href={HOME_ITEM.href} onClick={() => setOpen(false)} className="nav-link flex items-center gap-3 border-b border-border-soft pb-3 !text-foreground">
            <HomeIcon className="size-3.5" />
            {t(HOME_ITEM.label)}
          </Link>
          {groups.map((group) => (
            <section key={group.id}>
              <h3 className="eyebrow mb-2 px-1">{t(group.label)}</h3>
              <ul className="grid grid-cols-2 gap-px border border-border-soft bg-border-soft">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const badge = badges[item.href];
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 bg-surface px-3 py-3 text-[13px] transition-colors',
                          isActivePath(pathname, item.href) ? 'text-foreground underline underline-offset-4' : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{t(item.label)}</span>
                        {badge ? <span className="ml-auto text-[11px] tabular-nums text-foreground">{badge}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </Sheet>
    </>
  );
}

/** Thumb-reach bottom dock for phones: the four most used pages plus the full menu. */
export function MobileDock({ permissions, badges }: { permissions: Permission[]; badges: Badges }) {
  const pathname = usePathname();
  const dock = [HOME_ITEM, ...allowedGroups(new Set(permissions)).flatMap((g) => g.items)].filter((item) => DOCK_HREFS.includes(item.href));
  return (
    <nav aria-label={t('shell.menu')} className="fixed inset-x-3 bottom-3 z-40 lg:hidden print:hidden">
      <ul className="glass mx-auto flex max-w-md items-center justify-around rounded-md border border-border-soft p-1">
        {dock.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-col items-center gap-1 py-2 text-[9.5px] font-medium uppercase tracking-[0.12em] transition-colors', active ? 'text-foreground' : 'text-muted')}
              >
                <Icon className="size-4" />
                {t(item.label)}
                {badges[item.href] ? <span className="absolute right-3 top-1.5 size-1.5 rounded-full bg-foreground" /> : null}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="flex w-full flex-col items-center gap-1 py-2 text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted"
          >
            <LayoutGrid className="size-4" />
            {t('shell.menu.more')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
