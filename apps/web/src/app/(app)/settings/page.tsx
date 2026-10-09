import type { Metadata } from 'next';
import { LogOut, Settings, Shield, User } from 'lucide-react';
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

export const metadata: Metadata = { title: t('settings.title') };

const BASE = '/settings';
const TABS = ['profile', 'appearance', 'notifications', 'security'] as const;
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
  const [profile, notificationPrefs, theme] = await Promise.all([
    getProfile(session),
    tab === 'notifications' ? getNotificationPreferences(session.userId) : Promise.resolve([]),
    getTheme(),
  ]);
  const displayName = profile.name;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('settings.title')} description={t('settings.description')} eyebrow={<Settings className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      <TabLinks
        items={TABS.map((value) => ({
          href: withQuery(BASE, sp, { tab: value === 'profile' ? undefined : value }),
          label: t(`settings.tab.${value}`),
          active: tab === value,
          icon: value === 'profile' ? <User /> : value === 'security' ? <Shield /> : <Settings />,
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
              <p className="text-xs text-muted">{session.orgName} · {t(`shell.role.${session.role}`)}</p>
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
