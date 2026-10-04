'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutGrid, Menu as MenuIcon } from 'lucide-react';
import type { UserRole } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { HOME_ITEM, groupsForRole, isActivePath } from '@/shared/navigation/nav-config';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/overlays';

const OPEN_EVENT = 'open-mobile-menu';
const DOCK_HREFS = ['/dashboard', '/tasks', '/content', '/approvals'];

type Badges = Record<string, number>;

/** Hamburger + full menu sheet used below the `lg` breakpoint. Also opened by the bottom dock's "More". */
export function MobileMenu({ role, badges }: { role: UserRole; badges: Badges }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = groupsForRole(role);
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
          <Link href={HOME_ITEM.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-3 text-sm font-medium text-primary">
            <HomeIcon className="size-4" />
            {t(HOME_ITEM.label)}
          </Link>
          {groups.map((group) => (
            <section key={group.id}>
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t(group.label)}</h3>
              <ul className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const badge = badges[item.href];
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                          isActivePath(pathname, item.href) ? 'border-primary/50 bg-primary/12 text-primary' : 'border-border-soft bg-surface-2/60 hover:border-border',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{t(item.label)}</span>
                        {badge ? <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-contrast">{badge}</span> : null}
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
export function MobileDock({ role, badges }: { role: UserRole; badges: Badges }) {
  const pathname = usePathname();
  const dock = [HOME_ITEM, ...groupsForRole(role).flatMap((g) => g.items)].filter((item) => DOCK_HREFS.includes(item.href));
  return (
    <nav aria-label={t('shell.menu')} className="fixed inset-x-3 bottom-3 z-40 lg:hidden print:hidden">
      <ul className="glass mx-auto flex max-w-md items-center justify-around rounded-2xl p-1.5 shadow-2xl">
        {dock.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors', active ? 'bg-primary/16 text-primary' : 'text-muted')}
              >
                <Icon className="size-5" />
                {t(item.label)}
                {badges[item.href] ? <span className="absolute right-3 top-1 size-2 rounded-full bg-primary" /> : null}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="flex w-full flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium text-muted"
          >
            <LayoutGrid className="size-5" />
            {t('shell.menu.more')}
          </button>
        </li>
      </ul>
    </nav>
  );
}
