import Link from 'next/link';
import type { ContentStatus, ContentType, Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { PlatformStack } from '@/shared/ui/platform';
import { MobileDataCard, MobileDataHeader, MobileDataRow, ResponsiveDataView } from '@/shared/ui/responsive-data';
import { StatusBadge } from '@/shared/ui/status';

export interface ContentRow {
  id: string;
  title: string;
  contentType: ContentType;
  platforms: Platform[];
  status: ContentStatus;
  scheduledAt?: string;
  clientName?: string;
  clientColor?: string;
  authorName?: string;
}

export function ContentList({ rows }: { rows: ContentRow[] }) {
  const table = (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('content.col.title')}</th>
            <th className="px-4 py-3 font-medium">{t('content.col.client')}</th>
            <th className="px-4 py-3 font-medium">{t('content.col.channels')}</th>
            <th className="px-4 py-3 font-medium">{t('content.col.status')}</th>
            <th className="px-4 py-3 font-medium">{t('content.col.scheduled')}</th>
            <th className="px-4 py-3 font-medium">{t('content.col.author')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-surface-2">
              <td className="max-w-[320px] px-4 py-3">
                <Link href={`/content/${row.id}`} className="block truncate font-medium hover:text-primary">
                  {row.title}
                </Link>
                <span className="text-xs text-muted">{t(`type.content.${row.contentType}`)}</span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="size-2 rounded-full" style={{ background: row.clientColor }} />
                  {row.clientName}
                </span>
              </td>
              <td className="px-4 py-3">
                <PlatformStack platforms={row.platforms} size="xs" />
              </td>
              <td className="px-4 py-3">
                <StatusBadge kind="content" value={row.status} />
              </td>
              <td className="px-4 py-3 text-muted">{row.scheduledAt ? formatDateTime(row.scheduledAt) : '—'}</td>
              <td className="px-4 py-3">{row.authorName ? <Avatar name={row.authorName} size="xs" /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const cards = rows.map((row) => (
    <MobileDataCard key={row.id} href={`/content/${row.id}`}>
      <MobileDataHeader
        title={row.title}
        subtitle={t(`type.content.${row.contentType}`)}
        trailing={<StatusBadge kind="content" value={row.status} />}
      />
      {row.clientName ? (
        <MobileDataRow label={t('content.col.client')}>
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: row.clientColor }} />
            {row.clientName}
          </span>
        </MobileDataRow>
      ) : null}
      <MobileDataRow label={t('content.col.channels')}>
        <PlatformStack platforms={row.platforms} size="xs" />
      </MobileDataRow>
      <MobileDataRow label={t('content.col.scheduled')}>
        {row.scheduledAt ? formatDateTime(row.scheduledAt) : '—'}
      </MobileDataRow>
      {row.authorName ? (
        <MobileDataRow label={t('content.col.author')}>
          <Avatar name={row.authorName} size="xs" />
        </MobileDataRow>
      ) : null}
    </MobileDataCard>
  ));

  return <ResponsiveDataView table={table} cards={cards} />;
}
