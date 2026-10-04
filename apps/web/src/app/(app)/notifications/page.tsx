import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { requireSession } from '@/shared/auth/session';
import { t } from '@/shared/i18n/t';
import { FilterChips, param, withQuery, type SearchParams } from '@/shared/ui/nav-controls';
import { PageGuide, type GuideItem } from '@/shared/ui/page-guide';
import { PageHeader } from '@/shared/ui/page-header';
import { NotificationList } from '@/features/notifications/components/notification-list';
import { listForUser } from '@/features/notifications/services/notifications.service';

export const metadata: Metadata = { title: t('notifications.title') };

const BASE = '/notifications';
const FILTERS = ['all', 'unread'] as const;
type NotificationFilter = (typeof FILTERS)[number];

const GUIDE: GuideItem[] = [
  { title: t('notifications.guide.inbox.title'), body: t('notifications.guide.inbox.body') },
  { title: t('notifications.guide.prefs.title'), body: t('notifications.guide.prefs.body') },
];

function parseFilter(value: string | undefined): NotificationFilter {
  return FILTERS.find((f) => f === value) ?? 'all';
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const filter = parseFilter(param(sp, 'f'));
  const all = await listForUser(session.userId);
  const items = filter === 'unread' ? all.filter((n) => !n.read) : all;
  const unread = all.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('notifications.title')} description={t('notifications.description')} eyebrow={<Bell className="inline size-3.5" />} actions={<PageGuide items={GUIDE} />} />

      <FilterChips
        className="mb-5"
        items={FILTERS.map((f) => ({
          href: withQuery(BASE, sp, { f: f === 'all' ? undefined : f }),
          label: t(`notifications.filter.${f}`),
          active: filter === f,
          count: f === 'unread' ? unread : all.length,
        }))}
      />

      <NotificationList items={items} unread={unread} />
    </div>
  );
}
