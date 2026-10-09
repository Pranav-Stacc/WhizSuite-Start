import { ChevronRight } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDateTime, humanizeKey } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge, type BadgeTone } from '@/shared/ui/badge';
import type { AuditEntry } from '../data/audit.repository';

const OUTCOME_TONE: Record<AuditEntry['outcome'], BadgeTone> = {
  success: 'success',
  failure: 'danger',
};

interface AuditRowProps {
  entry: AuditEntry;
}

export function AuditRow({ entry }: AuditRowProps) {
  const diff = entry.diff ? Object.entries(entry.diff) : [];
  return (
    <article className="px-4 py-3 transition-colors hover:bg-surface-2/50 sm:px-5">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={entry.actorName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{entry.actorName}</p>
            <Badge tone={OUTCOME_TONE[entry.outcome]}>{t(`audit.outcome.${entry.outcome}`)}</Badge>
            <span className="text-xs text-muted">{formatDateTime(entry.at)}</span>
          </div>
          <p className="mt-1 text-sm">
            <span className="font-medium text-primary">{humanizeKey(entry.action)}</span>
            <span className="text-muted"> · {entry.entityLabel}</span>
          </p>
          <p className="mt-1 text-[13px] text-muted">{entry.summary}</p>
          {diff.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {diff.map(([field, change]) => (
                <li key={field} className="flex items-center gap-1">
                  <ChevronRight className="size-3 shrink-0" />
                  <span className="font-medium text-foreground">{field}</span>
                  {change.from !== undefined ? <span>{change.from}</span> : null}
                  {change.from !== undefined && change.to !== undefined ? <span>→</span> : null}
                  {change.to !== undefined ? <span className="text-foreground">{change.to}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <dl className="hidden shrink-0 text-right text-[11px] text-muted sm:block">
          <dt>{t('audit.field.entity')}</dt>
          <dd className="font-medium text-foreground">{entry.entityType}</dd>
          <dt className="mt-1">{t('audit.field.correlation')}</dt>
          <dd className="font-mono">{entry.correlationId.slice(0, 10)}</dd>
        </dl>
      </div>
    </article>
  );
}
