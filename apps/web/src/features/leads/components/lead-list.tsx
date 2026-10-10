import Link from 'next/link';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { DueBadge } from '@/shared/ui/due-badge';
import { MobileDataCard, MobileDataHeader, MobileDataRow, ResponsiveDataView } from '@/shared/ui/responsive-data';
import { StatusBadge } from '@/shared/ui/status';
import type { Lead } from '../data/leads.repository';

interface LeadListProps {
  leads: Lead[];
  ownerName: (memberId: string) => string | undefined;
  editHref: (leadId: string) => string;
}

export function LeadList({ leads, ownerName, editHref }: LeadListProps) {
  const table = (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">{t('leads.col.lead')}</th>
            <th className="px-4 py-3 font-medium">{t('leads.col.stage')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('leads.col.value')}</th>
            <th className="px-4 py-3 font-medium">{t('leads.col.source')}</th>
            <th className="px-4 py-3 font-medium">{t('leads.col.nextStep')}</th>
            <th className="px-4 py-3 font-medium">{t('leads.col.owner')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {leads.map((lead) => {
            const owner = ownerName(lead.ownerId);
            const closed = lead.stage === 'WON' || lead.stage === 'LOST';
            return (
              <tr key={lead.id} className="transition-colors hover:bg-surface-2">
                <td className="px-4 py-3">
                  <Link href={editHref(lead.id)} className="block font-medium hover:text-primary">
                    {lead.company}
                  </Link>
                  <span className="text-xs text-muted">{lead.contact || lead.industry}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge kind="lead" value={lead.stage} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(lead.valueMinor)}</td>
                <td className="px-4 py-3 text-muted">{lead.source}</td>
                <td className="px-4 py-3">
                  {lead.nextStep ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="max-w-[200px] truncate">{lead.nextStep}</span>
                      {closed ? null : <DueBadge date={lead.nextStepAt} />}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {owner ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={owner} size="xs" />
                      {owner}
                    </span>
                  ) : (
                    <span className="text-muted">{t('common.unassigned')}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const cards = leads.map((lead) => {
    const owner = ownerName(lead.ownerId);
    const closed = lead.stage === 'WON' || lead.stage === 'LOST';
    return (
      <MobileDataCard key={lead.id} href={editHref(lead.id)}>
        <MobileDataHeader
          title={lead.company}
          subtitle={lead.contact || lead.industry}
          trailing={<StatusBadge kind="lead" value={lead.stage} />}
        />
        <MobileDataRow label={t('leads.col.value')}>{formatMoney(lead.valueMinor)}</MobileDataRow>
        <MobileDataRow label={t('leads.col.source')}>{lead.source}</MobileDataRow>
        {lead.nextStep ? (
          <MobileDataRow label={t('leads.col.nextStep')}>
            <span className="inline-flex items-center gap-2">
              <span className="truncate">{lead.nextStep}</span>
              {closed ? null : <DueBadge date={lead.nextStepAt} />}
            </span>
          </MobileDataRow>
        ) : null}
        <MobileDataRow label={t('leads.col.owner')}>
          {owner ? (
            <span className="inline-flex items-center gap-2">
              <Avatar name={owner} size="xs" />
              {owner}
            </span>
          ) : (
            t('common.unassigned')
          )}
        </MobileDataRow>
      </MobileDataCard>
    );
  });

  return <ResponsiveDataView table={table} cards={cards} />;
}
