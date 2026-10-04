import { t } from '@/shared/i18n/t';
import { formatFileSize, formatNumber } from '@/shared/lib/format';
import { Progress } from '@/shared/ui/feedback';
import { KB_PER_GB, type LimitKey } from '../config';
import type { UsageLevel, UsageRow } from '../services/billing.service';

const LEVEL_TONE = { ok: 'primary', warning: 'warning', full: 'danger' } as const satisfies Record<UsageLevel, 'primary' | 'warning' | 'danger'>;

export function formatLimitValue(key: LimitKey, value: number): string {
  if (key !== 'storageKb') return formatNumber(value);
  return value >= KB_PER_GB ? `${formatNumber(Math.round(value / KB_PER_GB))} GB` : formatFileSize(value);
}

export function UsageMeter({ row }: { row: UsageRow }) {
  const used = formatLimitValue(row.key, row.used);
  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{t(`billing.limit.${row.key}`)}</h3>
        <span className="text-xs tabular-nums text-muted">
          {row.limit === undefined ? t('billing.usage.unlimited', { used }) : t('billing.usage.of', { used, limit: formatLimitValue(row.key, row.limit) })}
        </span>
      </div>
      <Progress value={row.limit === undefined ? 0 : row.ratio * 100} tone={LEVEL_TONE[row.level]} />
      {row.level !== 'ok' ? (
        <p className={row.level === 'full' ? 'mt-2 text-xs text-danger' : 'mt-2 text-xs text-warning'}>{t(`billing.usage.${row.level}`)}</p>
      ) : null}
    </div>
  );
}
