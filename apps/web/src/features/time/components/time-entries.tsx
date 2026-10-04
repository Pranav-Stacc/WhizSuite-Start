import { Trash2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatDate } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { ConfirmButton } from '@/shared/ui/confirm-button';
import { deleteTimeEntryAction } from '../actions/time.actions';

const MINUTES_PER_HOUR = 60;

export interface TimeRow {
  id: string;
  date: string;
  minutes: number;
  note: string;
  projectLabel: string;
  clientColor?: string;
  personName?: string;
  canDelete: boolean;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return hours ? `${hours}h ${rest ? `${rest}m` : ''}`.trim() : `${rest}m`;
}

export function TimeEntries({ rows, showPerson }: { rows: TimeRow[]; showPerson: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('time.col.date')}</th>
            <th className="px-4 py-3 font-medium">{t('time.col.project')}</th>
            {showPerson ? <th className="px-4 py-3 font-medium">{t('time.col.person')}</th> : null}
            <th className="px-4 py-3 text-right font-medium">{t('time.col.duration')}</th>
            <th className="w-24 px-4 py-3">
              <span className="sr-only">{t('common.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-surface-2">
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(row.date)}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: row.clientColor }} />
                  <span className="truncate">{row.projectLabel}</span>
                </span>
                {row.note ? <span className="mt-0.5 block truncate text-xs text-muted">{row.note}</span> : null}
              </td>
              {showPerson ? (
                <td className="px-4 py-3">
                  {row.personName ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={row.personName} size="xs" />
                      {row.personName}
                    </span>
                  ) : null}
                </td>
              ) : null}
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatDuration(row.minutes)}</td>
              <td className="px-4 py-3 text-right">{row.canDelete ? <ConfirmButton action={deleteTimeEntryAction.bind(null, row.id)} label={t('common.delete')} icon={<Trash2 />} size="sm" /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
