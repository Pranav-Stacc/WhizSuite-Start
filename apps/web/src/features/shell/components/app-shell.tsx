import Link from 'next/link';
import type { ReactNode } from 'react';
import { Permissions } from '@agency-os/contracts';
import { getPermissions } from '@/shared/auth/permissions';
import type { Session } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { getTheme } from '@/shared/theme/theme.server';
import { ThemeCustomizer } from '@/shared/theme/theme-customizer';
import { Badge } from '@/shared/ui/badge';
import { Logo } from '@/shared/ui/logo';
import { openInboxCount } from '@/features/inbox/services/inbox.service';
import { pendingApprovals } from '@/features/content/services/content.service';
import { listForUser } from '@/features/notifications/services/notifications.service';
import { CommandPalette, SearchTrigger } from './command-palette';
import { MobileDock, MobileMenu } from './mobile-nav';
import { ModuleTabs } from './module-tabs';
import { NotificationsBell, QuickCreate, UserMenu } from './shell-actions';
import { TopNav } from './top-nav';

/** Staff workspace chrome: a two-tier top bar (mega-menu + contextual module tabs) instead of a sidebar. */
export async function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const granted = await getPermissions();
  const [theme, notifications, approvals, inbox] = await Promise.all([
    getTheme(),
    listForUser(session.userId),
    granted.has(Permissions.APPROVALS_VIEW) ? pendingApprovals() : [],
    granted.has(Permissions.INBOX_VIEW) ? openInboxCount() : 0,
  ]);
  const badges: Record<string, number> = { '/approvals': approvals.length, '/inbox': inbox };
  const permissions = [...granted];

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-primary-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('shell.skip')}
      </a>
      <header className="glass sticky top-0 z-40 border-b border-border-soft print:hidden">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-8 lg:gap-8 lg:px-12">
          <MobileMenu permissions={permissions} badges={badges} />
          <Link href="/dashboard" className="min-w-0 max-w-56 outline-none" aria-label={session.orgName}>
            <Logo name={session.orgName} />
          </Link>
          {session.demo ? (
            <Badge tone="warning" title={t('common.demoBanner')} className="hidden md:inline-flex">
              {t('shell.demoBadge')}
            </Badge>
          ) : null}
          <div className="flex-1" />
          <TopNav permissions={permissions} badges={badges} />
          <div className="flex items-center gap-0.5">
            <SearchTrigger compact />
            <QuickCreate permissions={permissions} />
            <NotificationsBell
              items={notifications.slice(0, 8).map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: n.read, at: n.at }))}
              unread={notifications.filter((n) => !n.read).length}
            />
            <ThemeCustomizer initial={theme} />
            <UserMenu name={session.name} email={session.email} role={session.role} orgName={session.orgName} demo={session.demo} settingsHref="/settings" />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1600px] animate-fade-up px-4 pb-28 pt-8 sm:px-8 lg:px-12 lg:pb-16 lg:pt-10">
        <ModuleTabs permissions={permissions} badges={badges} />
        {children}
      </main>
      <MobileDock permissions={permissions} badges={badges} />
      <CommandPalette permissions={permissions} />
    </div>
  );
}
