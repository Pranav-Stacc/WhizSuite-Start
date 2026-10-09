'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Permission } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { HOME_ITEM, allowedGroups, isActivePath } from '@/shared/navigation/nav-config';
import { homePathForModule, type WorkspaceModule } from '@/shared/workspace/modules';
import { Logo } from '@/shared/ui/logo';
import { WorkspaceSwitcher } from './workspace-switcher';

type Badges = Record<string, number>;

interface AppSidebarProps {
  permissions: Permission[];
  badges: Badges;
  module?: WorkspaceModule;
  orgName: string;
  orgSlug?: string;
  canCrm: boolean;
  canFinance: boolean;
  /** Close mobile drawer after navigation. */
  onNavigate?: () => void;
  /** Hide logo when the parent sheet already shows the org name. */
  showBrand?: boolean;
  className?: string;
}

/** Shared nav body for the desktop rail and the mobile drawer. */
export function AppSidebar({
  permissions,
  badges,
  module = 'main',
  orgName,
  orgSlug,
  canCrm,
  canFinance,
  onNavigate,
  showBrand = true,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const groups = allowedGroups(new Set(permissions), module);
  const homeHref = homePathForModule(module);
  const HomeIcon = HOME_ITEM.icon;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className={cn('shrink-0 space-y-3 border-b border-border-soft', showBrand ? 'px-4 py-4' : 'px-1 pb-3')}>
        {showBrand ? (
          <Link href={homeHref} onClick={onNavigate} className="block min-w-0 outline-none" aria-label={orgName}>
            <Logo name={orgName} className="max-w-full text-[13px] tracking-[0.22em]" />
          </Link>
        ) : null}
        <WorkspaceSwitcher module={module} orgSlug={orgSlug} canCrm={canCrm} canFinance={canFinance} variant="sidebar" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label={t('shell.menu')}>
        <Link
          href={homeHref}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
            isActivePath(pathname, homeHref) && pathname === homeHref
              ? 'bg-surface-2 text-foreground'
              : 'text-muted hover:bg-surface-2 hover:text-foreground',
          )}
        >
          <HomeIcon className="size-3.5 shrink-0" />
          <span className="truncate">{t(HOME_ITEM.label)}</span>
        </Link>

        {groups.map((group) => (
          <section key={group.id}>
            <h3 className="eyebrow mb-1.5 px-2.5">{t(group.label)}</h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = badges[item.href];
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                        active ? 'bg-surface-2 text-foreground' : 'text-muted hover:bg-surface-2 hover:text-foreground',
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
    </div>
  );
}
