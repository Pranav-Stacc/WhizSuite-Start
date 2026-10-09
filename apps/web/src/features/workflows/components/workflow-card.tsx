import Link from 'next/link';
import { ChevronRight, Clock, Pencil, UserCheck } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Toggle } from '@/shared/ui/toggle';
import { toggleWorkflowAction } from '../actions/workflow.actions';
import type { Workflow } from '../data/workflows.repository';

interface WorkflowCardProps {
  workflow: Workflow;
  editHref: string;
}

export function WorkflowCard({ workflow, editHref }: WorkflowCardProps) {
  return (
    <Card className={cn('flex h-full flex-col gap-4 p-5', !workflow.active && 'opacity-80')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">{workflow.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={workflow.active ? 'success' : 'neutral'} dot>
              {workflow.active ? t('workflows.status.active') : t('workflows.status.inactive')}
            </Badge>
            {workflow.requiresClientApproval ? (
              <Badge tone="violet">
                <UserCheck className="size-3" />
                {t('workflows.clientApproval')}
              </Badge>
            ) : (
              <Badge tone="neutral">{t('workflows.internalOnly')}</Badge>
            )}
          </div>
        </div>
        <Toggle checked={workflow.active} label={t('workflows.toggle', { name: workflow.name })} action={toggleWorkflowAction.bind(null, workflow.id)} />
      </div>

      <ol className="flex flex-wrap items-center gap-y-2 text-[13px]" aria-label={t('workflows.stages')}>
        {workflow.stages.map((stage, index) => (
          <li key={`${stage.name}-${index}`} className="flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft bg-surface-2 px-2.5 py-1">
              <span className="grid size-4 place-items-center rounded-full bg-primary/16 text-[10px] font-semibold text-primary">{index + 1}</span>
              {stage.name}
              {stage.assigneeRoleId ? <UserCheck className="size-3 text-muted" aria-hidden /> : null}
            </span>
            {index < workflow.stages.length - 1 ? <ChevronRight className="mx-0.5 size-4 text-muted" aria-hidden /> : null}
          </li>
        ))}
      </ol>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-soft pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock className="size-3.5" />
          {t('workflows.sla', { hours: workflow.slaHours })}
        </span>
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
