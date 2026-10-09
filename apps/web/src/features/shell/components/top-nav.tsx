'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { UserRole } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { isActivePath, primaryNavForRole, secondaryGroupsForRole } from '@/shared/navigation/nav-config';
import { Menu } from '@/shared/ui/overlays';

/** Flat editorial navigation: uppercase text links, everything else tucked under "More". */
export function TopNav({ role, badges }: { role: UserRole; badges: Record<string, number> }) {
  const pathname = usePathname();
  const primary = primaryNavForRole(role);
  const secondary = secondaryGroupsForRole(role);
  const moreActive = secondary.some((group) => group.items.some((item) => isActivePath(pathname, item.href)));
  const moreBadge = secondary.reduce((acc, group) => acc + group.items.reduce((sum, item) => sum + (badges[item.href] ?? 0), 0), 0);

  return (
    <nav aria-label={t('shell.menu')} className="hidden items-center gap-6 lg:flex">
      {primary.map((item) => {
        const badge = badges[item.href];
        return (
          <Link key={item.href} href={item.href} aria-current={isActivePath(pathname, item.href) ? 'page' : undefined} className="nav-link relative">
            {t(item.label)}
            {badge ? <sup className="ml-0.5 text-[9px] tabular-nums text-foreground">{badge}</sup> : null}
          </Link>
        );
      })}
      {secondary.length > 0 ? (
        <Menu.Root>
          <Menu.Trigger className="nav-link inline-flex items-center gap-1 outline-none" aria-current={moreActive ? 'true' : undefined}>
            {t('shell.menu.more')}
            {moreBadge ? <sup className="text-[9px] tabular-nums text-foreground">{moreBadge}</sup> : null}
            <ChevronDown className="size-3" aria-hidden />
          </Menu.Trigger>
          <Menu.Content className="w-[min(92vw,440px)] p-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {secondary.map((group) => (
                <div key={group.id}>
                  <Menu.Label className="px-2">{t(group.label)}</Menu.Label>
                  {group.items.map((item) => (
                    <Menu.Item key={item.href} asChild>
                      <Link href={item.href} aria-current={isActivePath(pathname, item.href) ? 'page' : undefined} className="aria-[current=page]:underline">
                        {t(item.label)}
                        {badges[item.href] ? <span className="ml-auto text-[11px] tabular-nums text-muted">{badges[item.href]}</span> : null}
                      </Link>
                    </Menu.Item>
                  ))}
                </div>
              ))}
            </div>
          </Menu.Content>
        </Menu.Root>
      ) : null}
    </nav>
  );
}
