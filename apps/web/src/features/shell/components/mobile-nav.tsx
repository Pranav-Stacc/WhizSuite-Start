'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutGrid, Menu as MenuIcon } from 'lucide-react';
import type { Permission } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { isActivePath, primaryNav } from '@/shared/navigation/nav-config';
import type { WorkspaceModule } from '@/shared/workspace/modules';
import { Button } from '@/shared/ui/button';
import { Sheet } from '@/shared/ui/overlays';
import { AppSidebar } from './app-sidebar';

const OPEN_EVENT = 'open-mobile-menu';

type Badges = Record<string, number>;

/** Hamburger + left sidebar sheet used below the `lg` breakpoint. Also opened by the bottom dock's "More". */
export function MobileMenu({
  permissions,
  badges,
  module = 'main',
  orgName,
  orgSlug,
  canCrm,
  canFinance,
}: {
  permissions: Permission[];
  badges: Badges;
  module?: WorkspaceModule;
  orgName: string;
  orgSlug?: string;
  canCrm: boolean;
  canFinance: boolean;
}) {
  const [open, setOpen] = useState(false);

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
      <Sheet open={open} onOpenChange={setOpen} title={orgName} width="max-w-[18rem]" side="left">
        <AppSidebar
          permissions={permissions}
          badges={badges}
          module={module}
          orgName={orgName}
          orgSlug={orgSlug}
          canCrm={canCrm}
          canFinance={canFinance}
          onNavigate={() => setOpen(false)}
          showBrand={false}
          className="min-h-[calc(100dvh-5rem)]"
        />
      </Sheet>
    </>
  );
}

/** Thumb-reach bottom dock for phones: primary module pages plus the full menu. */
export function MobileDock({
  permissions,
  badges,
  module = 'main',
}: {
  permissions: Permission[];
  badges: Badges;
  module?: WorkspaceModule;
}) {
  const pathname = usePathname();
  const dock = primaryNav(new Set(permissions), module).slice(0, 4);
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
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2 text-[9.5px] font-medium uppercase tracking-[0.12em] transition-colors',
                  active ? 'text-foreground' : 'text-muted',
                )}
              >
                <Icon className="size-4" />
                <span className="max-w-full truncate px-0.5">{t(item.label)}</span>
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
