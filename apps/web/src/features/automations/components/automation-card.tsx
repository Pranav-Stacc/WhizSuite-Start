import Link from 'next/link';
import { ArrowRight, Pencil, Play } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/format';
import { ActionButton } from '@/shared/ui/action-button';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Toggle } from '@/shared/ui/toggle';
import { runAutomationAction, toggleAutomationAction } from '../actions/automation.actions';
import type { Automation } from '../data/automations.repository';

interface AutomationCardProps {
  automation: Automation;
  editHref: string;
}

export function AutomationCard({ automation, editHref }: AutomationCardProps) {
  return (
    <Card className={cn('flex h-full flex-col gap-4 p-5', !automation.enabled && 'opacity-80')}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug">{automation.name}</h3>
        <Toggle checked={automation.enabled} label={t('automations.toggle', { name: automation.name })} action={toggleAutomationAction.bind(null, automation.id)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1">
          <span className="text-muted">{t('automations.when')} </span>
          {t(`automations.trigger.${automation.trigger}` as MessageKey)}
        </span>
        <ArrowRight className="size-4 text-primary" aria-hidden />
        <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1">
          <span className="text-muted">{t('automations.then')} </span>
          {t(`automations.action.${automation.action}` as MessageKey)}
        </span>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted">{t('automations.stat.runs')}</dt>
          <dd className="text-sm font-semibold tabular-nums">{automation.runs}</dd>
        </div>
        <div>
          <dt className="text-muted">{t('automations.stat.failures')}</dt>
          <dd className="text-sm font-semibold tabular-nums">{automation.failures > 0 ? <Badge tone="danger">{automation.failures}</Badge> : automation.failures}</dd>
        </div>
        <div>
          <dt className="text-muted">{t('automations.stat.last')}</dt>
          <dd className="text-sm font-semibold">{automation.lastRunAt ? relativeTime(automation.lastRunAt) : t('automations.never')}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-2 border-t border-border-soft pt-3">
        <ActionButton action={runAutomationAction.bind(null, automation.id)} label={t('automations.run')} icon={<Play />} size="sm" />
        <Button variant="ghost" size="sm" asChild>
          <Link href={editHref}>
            <Pencil />
            {t('common.edit')}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
