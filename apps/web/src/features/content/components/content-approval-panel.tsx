'use client';

import { useTransition } from 'react';
import { Bell, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { sendApprovalReminderAction } from '../actions/content.actions';
import type { ContentApprovalSummary } from '../services/content-approval.service';

interface ContentApprovalPanelProps {
  summary: ContentApprovalSummary;
  memberNames: Record<string, string>;
  canRemind: boolean;
}

function stepLabel(status: string): string {
  if (status === 'APPROVED') return t('content.approval.step.done');
  if (status === 'PENDING') return t('content.approval.step.pending');
  return t('content.approval.step.upcoming');
}

export function ContentApprovalPanel({ summary, memberNames, canRemind }: ContentApprovalPanelProps) {
  const [pending, start] = useTransition();
  const current = summary.currentStep;
  const waiting =
    current.approverUserIds.length > 0
      ? current.approverUserIds.map((id) => memberNames[id] ?? id).join(', ')
      : t('content.approval.anyApprover');

  const remind = () => {
    start(async () => {
      const result = await sendApprovalReminderAction(summary.requestId);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-soft bg-surface-2/60 px-3 py-3 text-xs">
      <div>
        <p className="font-medium text-foreground">
          {t('content.approval.stage', {
            step: current.order,
            total: summary.totalSteps,
            name: current.name,
          })}
        </p>
        <p className="mt-1 text-muted">{t('content.approval.waiting', { who: waiting })}</p>
        {summary.dueAt ? (
          <p className="mt-0.5 text-muted">{t('content.approval.due', { at: new Date(summary.dueAt).toLocaleString() })}</p>
        ) : null}
      </div>

      {summary.steps.length > 1 ? (
        <ol className="space-y-1.5 border-t border-border-soft pt-2">
          {summary.steps.map((step) => {
            const names =
              step.approverUserIds.length > 0
                ? step.approverUserIds.map((id) => memberNames[id] ?? id).join(', ')
                : t('content.approval.anyApprover');
            const Icon =
              step.status === 'APPROVED'
                ? CheckCircle2
                : step.status === 'PENDING'
                  ? Circle
                  : Circle;
            return (
              <li
                key={step.order}
                className={step.status === 'PENDING' ? 'text-foreground' : 'text-muted'}
              >
                <span className="inline-flex items-start gap-2">
                  <Icon
                    className={step.status === 'APPROVED' ? 'size-3.5 shrink-0 text-success' : 'size-3.5 shrink-0'}
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">{step.name}</span>
                    <span className="text-muted"> — {stepLabel(step.status)}</span>
                    {step.status === 'PENDING' ? (
                      <span className="block text-muted">{names}</span>
                    ) : null}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {canRemind && summary.status === 'PENDING' ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={remind}>
          {pending ? <Loader2 className="animate-spin" /> : <Bell />}
          {t('content.approval.remind')}
        </Button>
      ) : null}
    </div>
  );
}
