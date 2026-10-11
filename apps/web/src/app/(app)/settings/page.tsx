import type { Metadata } from 'next';
import { HardDrive, LogOut, Settings, Shield, User } from 'lucide-react';
import { Permissions } from '@agency-os/contracts';
import { getAccessCapabilities } from '@/shared/auth/access-capabilities';
import { sessionAccessLabel } from '@/shared/auth/member-labels';
import { getPermissions } from '@/shared/auth/permissions';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { getTheme } from '@/shared/theme/theme.server';
import { ThemeCustomizer } from '@/shared/theme/theme-customizer';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { TabLinks, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import type { NotificationTypeKey } from '@agency-os/contracts';
import { getNotificationPreferences, getProfile } from '@/features/settings/services/settings.service';
import { PreferenceRow } from '@/features/settings/components/preference-row';
import { ProfileForm } from '@/features/settings/components/profile-form';
import { DataSourcesPanel } from '@/features/media/components/data-sources-panel';
import { StorageUsageCard } from '@/features/media/components/storage-usage-card';
import { listDataSources, getStorageUsage } from '@/features/media/services/storage.service';
import { getGoogleCalendarConnection } from '@/features/calendar/services/google-calendar.service';
import { GoogleCalendarSettings } from '@/features/settings/components/google-calendar-settings';
import { isLiveMode } from '@/shared/config/env';
import { getActiveWorkspaceId, listTenancyWorkspaces } from '@/shared/api/live/workspace';
import { OrgWorkspacesSettings } from '@/features/workspaces/components/org-workspaces-settings';
import { TENANCY_WORKSPACE_UI_ENABLED } from '@/shared/workspace/tenancy-ui';

export const metadata: Metadata = { title: t('settings.title') };

const BASE = '/settings';
const TABS = ['profile', 'appearance', 'notifications', 'storage', 'security', 'workspaces'] as const;
type SettingsTab = (typeof TABS)[number];

const GUIDE: GuideItem[] = [
  { title: t('settings.guide.profile.title'), body: t('settings.guide.profile.body') },
  { title: t('settings.guide.theme.title'), body: t('settings.guide.theme.body') },
  { title: t('settings.guide.security.title'), body: t('settings.guide.security.body') },
];

function parseTab(value: string | undefined): SettingsTab {
  return TABS.find((tab) => tab === value) ?? 'profile';
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const tab = parseTab(param(sp, 'tab'));
  const granted = await getPermissions();
  const access = await getAccessCapabilities();
  const accessLabel = sessionAccessLabel(session.role, access?.roles ?? []);
  const canViewWorkspaces = TENANCY_WORKSPACE_UI_ENABLED && granted.has(Permissions.WORKSPACES_VIEW);
  const [profile, notificationPrefs, theme, storageUsage, dataSources, googleCalendar, tenancyWorkspaces, activeWorkspaceId] =
    await Promise.all([
      getProfile(session),
      tab === 'notifications' ? getNotificationPreferences(session.userId) : Promise.resolve([]),
      getTheme(),
      tab === 'storage' ? getStorageUsage() : Promise.resolve(null),
      tab === 'storage' ? listDataSources() : Promise.resolve([]),
      tab === 'storage' ? getGoogleCalendarConnection() : Promise.resolve(null),
      tab === 'workspaces' && canViewWorkspaces ? listTenancyWorkspaces() : Promise.resolve([]),
      tab === 'workspaces' && canViewWorkspaces ? getActiveWorkspaceId() : Promise.resolve(''),
    ]);
  const displayName = profile.name;
  const driveFlash = param(sp, 'drive');
  const gcalFlash = param(sp, 'gcal');
  const canCalendarSync = granted.has(Permissions.CALENDAR_SYNC) && isLiveMode;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('settings.title')} description={t('settings.description')} eyebrow={<Settings className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      <TabLinks
        items={TABS.filter((value) => value !== 'workspaces' || canViewWorkspaces).map((value) => ({
          href: withQuery(BASE, sp, {
            tab: value === 'profile' ? undefined : value,
            drive: undefined,
            gcal: undefined,
          }),
          label: t(`settings.tab.${value}`),
          active: tab === value,
          icon:
            value === 'profile' ? (
              <User />
            ) : value === 'security' ? (
              <Shield />
            ) : value === 'storage' ? (
              <HardDrive />
            ) : (
              <Settings />
            ),
        }))}
      />

      {tab === 'profile' ? (
        <Card>
          <CardHeader title={t('settings.profile.heading')} action={<ProfileForm name={displayName} title={profile.title} defaultOpen={param(sp, 'edit') === '1'} />} />
          <CardBody className="flex items-center gap-4">
            <Avatar name={displayName} size="lg" />
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-muted">{profile.title || t('team.noTitle')}</p>
              <p className="mt-1 text-sm text-muted">{session.email}</p>
              <p className="text-xs text-muted">
                {session.orgName} · {accessLabel}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {tab === 'appearance' ? (
        <Card>
          <CardHeader title={t('settings.appearance.title')} description={t('settings.appearance.desc')} />
          <CardBody>
            <ThemeCustomizer initial={theme} trigger="button" />
          </CardBody>
        </Card>
      ) : null}

      {tab === 'notifications' ? (
        <Card>
          <CardHeader title={t('settings.notifications.title')} description={t('settings.notifications.desc')} />
          <CardBody>
            {notificationPrefs.map((pref) => (
              <PreferenceRow key={pref.typeKey} typeKey={pref.typeKey as NotificationTypeKey} enabled={pref.enabled} />
            ))}
          </CardBody>
        </Card>
      ) : null}

      {tab === 'storage' && storageUsage ? (
        <div className="space-y-6">
          {driveFlash === 'connected' ? (
            <p role="status" className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {t('media.storage.drive.connected')}
            </p>
          ) : null}
          {driveFlash === 'error' ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {t('media.storage.drive.error')}
            </p>
          ) : null}
          {gcalFlash === 'error' ? (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {t('calendar.sync.error')}
            </p>
          ) : null}
          <StorageUsageCard usage={storageUsage} />
          {googleCalendar ? (
            <GoogleCalendarSettings
              connection={googleCalendar}
              canManage={canCalendarSync}
              toastStatus={gcalFlash}
            />
          ) : null}
          <div>
            <h2 className="mb-3 text-sm font-semibold">{t('media.sources.title')}</h2>
            <p className="mb-4 text-[13px] text-muted">{t('media.sources.description')}</p>
            <p className="mb-4 text-[13px] text-muted">{t('settings.storage.driveSharingNote')}</p>
            <DataSourcesPanel
              sources={dataSources}
              canManage={granted.has(Permissions.INTEGRATIONS_MANAGE)}
              canTransfer={granted.has(Permissions.FILES_UPLOAD)}
            />
          </div>
        </div>
      ) : null}

      {tab === 'workspaces' && canViewWorkspaces ? (
        <OrgWorkspacesSettings
          workspaces={tenancyWorkspaces}
          activeId={activeWorkspaceId}
          canCreate={granted.has(Permissions.WORKSPACES_CREATE)}
        />
      ) : null}

      {tab === 'security' ? (
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t('settings.security.signOut')}</p>
                <p className="text-[13px] text-muted">{t('settings.security.signOut.desc')}</p>
              </div>
              <SignOutButton>
                <Button variant="danger">
                  <LogOut />
                  {t('shell.user.signOut')}
                </Button>
              </SignOutButton>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
