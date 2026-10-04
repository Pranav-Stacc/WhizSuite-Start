import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { formatMoney } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { DueBadge } from '@/shared/ui/due-badge';
import type { Lead } from '../data/leads.repository';

interface LeadCardContentProps {
  lead: Lead;
  ownerName?: string;
}

/** Card body for the pipeline board; the Kanban card supplies drag, link and move menu. */
export function LeadCardContent({ lead, ownerName }: LeadCardContentProps) {
  const closed = lead.stage === 'WON' || lead.stage === 'LOST';
  return (
    <div className="space-y-2.5 pr-5">
      <div>
        <p className="truncate text-sm font-medium leading-snug">{lead.company}</p>
        <p className="truncate text-xs text-muted">{lead.contact || lead.industry}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold tabular-nums text-primary">{formatMoney(lead.valueMinor, undefined, true)}</span>
        <Badge tone="neutral">{lead.source}</Badge>
      </div>
      {lead.convertedClientId ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckCircle2 className="size-3.5" />
          {t('leads.converted')}
        </p>
      ) : lead.nextStep ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarClock className="size-3.5 shrink-0" />
          <span className="truncate">{lead.nextStep}</span>
          {closed ? null : <DueBadge date={lead.nextStepAt} />}
        </p>
      ) : null}
      {ownerName ? (
        <div className="flex justify-end">
          <Avatar name={ownerName} size="xs" />
        </div>
      ) : null}
    </div>
  );
}
