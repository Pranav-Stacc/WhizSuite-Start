import { CheckCircle2, XCircle } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { relativeTime } from '@/shared/lib/format';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import type { AutomationRun } from '../data/automations.repository';

interface RunLogProps {
  runs: AutomationRun[];
  automationName: (automationId: string) => string | undefined;
}

export function RunLog({ runs, automationName }: RunLogProps) {
  return (
    <Card>
      <CardHeader title={t('automations.log.title')} description={t('automations.log.desc')} />
      <CardBody>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">{t('automations.log.empty')}</p>
        ) : (
          <ol className="space-y-3">
            {runs.map((run) => (
              <li key={run.id} className="flex gap-3 text-sm">
                {run.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label={t('automations.log.ok')} /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t('automations.log.failed')} />}
                <div className="min-w-0">
                  <p className="font-medium">{automationName(run.automationId) ?? t('automations.log.deleted')}</p>
                  <p className="text-[13px] text-muted">{run.detail}</p>
                  <time dateTime={run.at} className="text-xs text-muted">
                    {relativeTime(run.at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
