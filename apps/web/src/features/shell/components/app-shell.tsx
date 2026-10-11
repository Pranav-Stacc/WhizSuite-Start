import Link from 'next/link';
import type { ReactNode } from 'react';
import { Permissions } from '@agency-os/contracts';
import { getAccessCapabilities } from '@/shared/auth/access-capabilities';
import { sessionAccessLabel } from '@/shared/auth/member-labels';
import { getPermissions } from '@/shared/auth/permissions';
import type { Session } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { getTheme } from '@/shared/theme/theme.server';
import { ThemeCustomizer } from '@/shared/theme/theme-customizer';
import { Badge } from '@/shared/ui/badge';
import { Logo } from '@/shared/ui/logo';
import { unreadChatCount } from '@/features/chat/services/chat.service';
import { pendingApprovals } from '@/features/content/services/content.service';
import { WebPushPermissionPrompt } from '@/features/notifications/components/web-push-permission-prompt';
import { WebPushRegistrar } from '@/features/notifications/components/web-push-registrar';
import { WorkspaceSetupJourney } from '@/features/setup/components/workspace-setup-journey';
import { getSetupProgress } from '@/features/setup/services/setup-progress.service';
import { listForUser } from '@/features/notifications/services/notifications.service';
import { isLiveMode } from '@/shared/config/env';
import { getWorkspaceContext } from '@/shared/workspace/context';
import { homePathForModule } from '@/shared/workspace/modules';
import { CommandPalette, SearchTrigger } from './command-palette';
import { MobileDock, MobileMenu } from './mobile-nav';
import { ModuleTabs } from './module-tabs';
import { NotificationsBell, QuickCreate, UserMenu } from './shell-actions';
import { TopNav } from './top-nav';
import { ActiveWorkspaceBanner } from '@/features/workspaces/components/active-workspace-banner';
import { OrgWorkspaceSwitcher } from '@/features/workspaces/components/org-workspace-switcher';
import { getActiveWorkspaceId, listTenancyWorkspaces } from '@/shared/api/live/workspace';
import { TENANCY_WORKSPACE_UI_ENABLED } from '@/shared/workspace/tenancy-ui';
import { WorkspaceSwitcher } from './workspace-switcher';

/** Staff workspace chrome: product surface (main / CRM) + module tabs. Finance lives on main. */
export async function AppShell({ session, children }: { session: Session; children: ReactNode }) {
  const granted = await getPermissions();
  const workspace = await getWorkspaceContext();
  const tenancyWorkspaceUi =
    TENANCY_WORKSPACE_UI_ENABLED && granted.has(Permissions.WORKSPACES_VIEW);
  const [theme, notifications, approvals, chatUnread, access, setupProgress, tenancyWorkspaces, activeWorkspaceId] =
    await Promise.all([
      getTheme(),
      listForUser(session.userId),
      granted.has(Permissions.APPROVALS_VIEW) ? pendingApprovals().catch(() => []) : [],
      granted.has(Permissions.CHAT_VIEW) ? unreadChatCount().catch(() => 0) : 0,
      getAccessCapabilities(),
      getSetupProgress(),
      tenancyWorkspaceUi ? listTenancyWorkspaces() : Promise.resolve([]),
      tenancyWorkspaceUi ? getActiveWorkspaceId() : Promise.resolve(''),
    ]);
  const accessLabel = sessionAccessLabel(session.role, access?.roles ?? []);
  const badges: Record<string, number> = { '/approvals': approvals.length, '/chat': chatUnread };
  const permissions = [...granted];
  const home = homePathForModule(workspace.module);

  return (
    <div className="min-h-dvh">
      <WebPushPermissionPrompt enabled={isLiveMode} />
      <WebPushRegistrar enabled={isLiveMode} />
      <WorkspaceSetupJourney progress={setupProgress} />
      <a href="#main" className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 font-medium text-primary-contrast focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('shell.skip')}
      </a>
      <header className="glass sticky top-0 z-40 border-b border-border-soft print:hidden">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-8 lg:gap-8 lg:px-12">
          <MobileMenu permissions={permissions} badges={badges} module={workspace.module} orgSlug={session.orgSlug} />
          <Link href={home} className="min-w-0 max-w-[9rem] outline-none sm:max-w-56" aria-label={session.orgName}>
            <Logo name={session.orgName} />
          </Link>
          <WorkspaceSwitcher
            module={workspace.module}
            orgSlug={session.orgSlug}
            canCrm={granted.has(Permissions.LEADS_VIEW)}
          />
          {tenancyWorkspaceUi && tenancyWorkspaces.length > 0 ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <OrgWorkspaceSwitcher
                workspaces={tenancyWorkspaces}
                activeId={activeWorkspaceId}
                canCreate={granted.has(Permissions.WORKSPACES_CREATE)}
              />
            </div>
          ) : null}
          {session.demo ? (
            <Badge tone="warning" title={t('common.demoBanner')} className="hidden md:inline-flex">
              {t('shell.demoBadge')}
            </Badge>
          ) : null}
          <div className="flex-1" />
          <TopNav permissions={permissions} badges={badges} module={workspace.module} orgSlug={session.orgSlug} />
          <div className="flex items-center gap-0.5">
            <SearchTrigger compact />
            <QuickCreate permissions={permissions} />
            <NotificationsBell
              items={notifications.slice(0, 8).map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: n.read, at: n.at }))}
              unread={notifications.filter((n) => !n.read).length}
            />
            <ThemeCustomizer initial={theme} canSaveOrg={granted.has(Permissions.ORG_BRANDING_MANAGE)} />
            <UserMenu
              name={session.name}
              email={session.email}
              role={session.role}
              accessLabel={accessLabel}
              orgName={session.orgName}
              demo={session.demo}
              settingsHref="/settings"
            />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1600px] px-4 pb-28 pt-8 sm:px-8 lg:px-12 lg:pb-16 lg:pt-10">
        <ModuleTabs permissions={permissions} badges={badges} module={workspace.module} />
        {tenancyWorkspaceUi ? <ActiveWorkspaceBanner /> : null}
        {children}
      </main>
      <MobileDock permissions={permissions} badges={badges} module={workspace.module} orgSlug={session.orgSlug} />
      <CommandPalette permissions={permissions} module={workspace.module} />
    </div>
  );
}
