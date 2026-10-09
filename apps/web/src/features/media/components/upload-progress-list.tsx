import { CheckCircle2, XCircle } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import type { UploadItem } from '../hooks/use-asset-upload';

const PERCENT = 100;

export function UploadProgressList({ items }: { items: UploadItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2" aria-live="polite">
      {items.map((item) => (
        <li key={item.key} className="border border-border p-2.5">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate" title={item.file.name}>
              {item.file.name}
            </span>
            {item.status === 'done' ? <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-label={t('media.upload.done')} /> : null}
            {item.status === 'error' ? <XCircle className="size-3.5 shrink-0 text-danger" aria-label={t('media.upload.failed')} /> : null}
          </div>
          <div
            role="progressbar"
            aria-label={t('media.upload.progress', { name: item.file.name })}
            aria-valuemin={0}
            aria-valuemax={PERCENT}
            aria-valuenow={Math.round(item.progress * PERCENT)}
            className="mt-2 h-px overflow-hidden bg-border"
          >
            <div className="h-full bg-foreground transition-[width]" style={{ width: `${item.progress * PERCENT}%` }} />
          </div>
          {item.error ? <p className="mt-1.5 text-[11px] text-danger">{item.error}</p> : null}
        </li>
      ))}
    </ul>
  );
}
