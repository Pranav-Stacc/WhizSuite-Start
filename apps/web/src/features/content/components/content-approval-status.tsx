import { listMembers } from '@/features/team/services/members.service';
import { t } from '@/shared/i18n/t';
import type { ContentApprovalSummary } from '../services/content-approval.service';

export async function ContentApprovalStatus({
  summary,
}: {
  summary: ContentApprovalSummary | null;
}) {
  if (!summary) return null;
  const members = await listMembers();
  const names = summary.currentStep.approverUserIds
    .map((id) => members.find((m) => (m.userId ?? m.id) === id)?.name ?? id)
    .filter(Boolean);
  const waiting =
    names.length > 0
      ? names.join(', ')
      : t('content.approval.anyApprover');
  return (
    <div className="rounded-lg border border-border-soft bg-surface-2/60 px-3 py-2 text-xs text-muted">
      <p className="font-medium text-foreground">
        {t('content.approval.stage', {
          step: summary.currentStep.order,
          total: summary.totalSteps,
          name: summary.currentStep.name,
        })}
      </p>
      <p>{t('content.approval.waiting', { who: waiting })}</p>
      {summary.dueAt ? (
        <p className="mt-0.5">{t('content.approval.due', { at: new Date(summary.dueAt).toLocaleString() })}</p>
      ) : null}
    </div>
  );
}
