import Link from 'next/link';
import type { ReactNode } from 'react';
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
  const [theme, notifications, approvals, inbox] = await Promise.all([getTheme(), listForUser(session.userId), pendingApprovals(), openInboxCount()]);
  const badges: Record<string, number> = { '/approvals': approvals.length, '/inbox': inbox };

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-primary-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('shell.skip')}
      </a>
      <header className="glass sticky top-0 z-40 border-b border-border-soft">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <MobileMenu role={session.role} badges={badges} />
          <Link href="/dashboard" className="mr-1 flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={t('app.name')}>
            <Logo compact />
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="max-w-40 truncate text-sm font-semibold">{session.orgName}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{t('shell.workspace')}</span>
            </span>
          </Link>
          {session.demo ? (
            <Badge tone="warning" title={t('common.demoBanner')} className="hidden md:inline-flex">
              {t('shell.demoBadge')}
            </Badge>
          ) : null}
          <TopNav role={session.role} badges={badges} />
          <div className="flex-1" />
          <div className="hidden md:block">
            <SearchTrigger />
          </div>
          <div className="md:hidden">
            <SearchTrigger compact />
          </div>
          <QuickCreate role={session.role} />
          <NotificationsBell
            items={notifications.slice(0, 8).map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: n.read, at: n.at }))}
            unread={notifications.filter((n) => !n.read).length}
          />
          <ThemeCustomizer initial={theme} />
          <UserMenu name={session.name} email={session.email} role={session.role} orgName={session.orgName} demo={session.demo} settingsHref="/settings" />
        </div>
        <ModuleTabs role={session.role} badges={badges} />
      </header>
      <main id="main" className="mx-auto max-w-[1600px] animate-fade-up px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
        {children}
      </main>
      <MobileDock role={session.role} badges={badges} />
      <CommandPalette role={session.role} />
    </div>
  );
}
