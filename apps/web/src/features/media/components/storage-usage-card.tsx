import Link from 'next/link';
import { HardDrive } from 'lucide-react';
import type { MediaStorageUsageDto } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { formatNumber } from '@/shared/lib/format';
import { Progress } from '@/shared/ui/feedback';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatNumber(Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${formatNumber(Math.round(mb * 10) / 10)} MB`;
  const gb = mb / 1024;
  return `${formatNumber(Math.round(gb * 10) / 10)} GB`;
}

export function StorageUsageCard({ usage }: { usage: MediaStorageUsageDto }) {
  const used = formatBytes(usage.usedBytes);
  const limit = usage.limitBytes === null ? null : formatBytes(usage.limitBytes);
  const ratio = usage.limitBytes ? usage.ratio : 0;
  const tone = ratio >= 0.95 ? 'danger' : ratio >= 0.8 ? 'warning' : 'primary';

  return (
    <section className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="size-3.5 text-muted" aria-hidden />
          <h2 className="text-sm font-medium">{t('media.storage.title')}</h2>
        </div>
        <p className="text-xs tabular-nums text-muted">
          {limit
            ? t('media.storage.of', { used, limit })
            : t('media.storage.unlimited', { used })}
          {' · '}
          {t('media.storage.files', { count: usage.assetCount })}
        </p>
        {usage.limitBytes !== null ? <Progress value={ratio * 100} tone={tone} className="mt-3" /> : null}
      </div>
      <Link href="/settings?tab=storage" className="nav-link shrink-0 text-[12px]">
        {t('media.storage.manage')}
      </Link>
    </section>
  );
}
