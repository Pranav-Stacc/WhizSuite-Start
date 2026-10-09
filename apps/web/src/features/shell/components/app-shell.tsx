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
import { unreadChatCount } from '@/features/chat/services/chat.service';
import { pendingApprovals } from '@/features/content/services/content.service';
import { WebPushRegistrar } from '@/features/notifications/components/web-push-registrar';
import { listForUser } from '@/features/notifications/services/notifications.service';
import { isLiveMode } from '@/shared/config/env';
import { getWorkspaceContext } from '@/shared/workspace/context';
import { homePathForModule } from '@/shared/workspace/modules';
import { AppSidebar } from './app-sidebar';
import { CommandPalette, SearchTrigger } from './command-palette';
import { MobileDock, MobileMenu } from './mobile-nav';
import { ModuleTabs } from './module-tabs';
import { NotificationsBell, QuickCreate, UserMenu } from './shell-actions';

/** Staff workspace chrome: left sidebar (desktop) + top bar + mobile drawer/dock. */
export async function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const granted = await getPermissions();
  const workspace = await getWorkspaceContext();
  const [theme, notifications, approvals, chatUnread] = await Promise.all([
    getTheme(),
    listForUser(session.userId),
    granted.has(Permissions.APPROVALS_VIEW) ? pendingApprovals() : [],
    granted.has(Permissions.CHAT_VIEW) ? unreadChatCount() : 0,
  ]);
  const badges: Record<string, number> = { '/approvals': approvals.length, '/chat': chatUnread };
  const permissions = [...granted];
  const home = homePathForModule(workspace.module);
  const canCrm = granted.has(Permissions.LEADS_VIEW);
  const canFinance = granted.has(Permissions.INVOICES_VIEW) || granted.has(Permissions.REPORTS_VIEW);

  return (
    <div className="min-h-dvh lg:pl-60">
      <WebPushRegistrar enabled={isLiveMode} />
      <a
        href="#main"
        className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-primary-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('shell.skip')}
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border-soft bg-surface print:hidden lg:flex">
        <AppSidebar
          permissions={permissions}
          badges={badges}
          module={workspace.module}
          orgName={session.orgName}
          orgSlug={session.orgSlug}
          canCrm={canCrm}
          canFinance={canFinance}
        />
      </aside>

      <header className="glass sticky top-0 z-40 border-b border-border-soft print:hidden">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
          <MobileMenu
            permissions={permissions}
            badges={badges}
            module={workspace.module}
            orgName={session.orgName}
            orgSlug={session.orgSlug}
            canCrm={canCrm}
            canFinance={canFinance}
          />
          <Link href={home} className="min-w-0 flex-1 outline-none lg:hidden" aria-label={session.orgName}>
            <Logo name={session.orgName} className="max-w-[11rem] text-[12px] tracking-[0.2em] sm:max-w-56" />
          </Link>
          {session.demo ? (
            <Badge tone="warning" title={t('common.demoBanner')} className="hidden shrink-0 md:inline-flex">
              {t('shell.demoBadge')}
            </Badge>
          ) : null}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <SearchTrigger compact />
            <span className="hidden sm:inline-flex">
              <QuickCreate permissions={permissions} />
            </span>
            <NotificationsBell
              items={notifications.slice(0, 8).map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                href: n.href,
                read: n.read,
                at: n.at,
              }))}
              unread={notifications.filter((n) => !n.read).length}
            />
            <span className="hidden sm:inline-flex">
              <ThemeCustomizer initial={theme} canSaveOrg={granted.has(Permissions.ORG_BRANDING_MANAGE)} />
            </span>
            <UserMenu
              name={session.name}
              email={session.email}
              role={session.role}
              orgName={session.orgName}
              demo={session.demo}
              settingsHref="/settings"
            />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1600px] animate-fade-up px-3 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-16 lg:pt-10">
        <ModuleTabs permissions={permissions} badges={badges} module={workspace.module} />
        {children}
      </main>

      <MobileDock permissions={permissions} badges={badges} module={workspace.module} />
      <CommandPalette permissions={permissions} module={workspace.module} />
    </div>
  );
}
