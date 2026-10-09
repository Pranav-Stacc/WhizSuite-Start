import { CheckCircle2, ThumbsDown, Undo2 } from 'lucide-react';
import type { ApprovalAction } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import type { ActionResult } from '@/shared/data/action-result';
import { FormDialog } from '@/shared/forms/form-dialog';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { decideContentAction } from '../actions/content.actions';

type DecideAction = (contentId: string, decision: ApprovalAction, raw: unknown) => Promise<ActionResult>;

interface ReviewActionsProps {
  contentId: string;
  title: string;
  size?: 'sm' | 'md';
  /** Server action recording the decision; the client portal passes its own client-scoped action. */
  decide?: DecideAction;
}

/** Approve / request changes / reject — the three outcomes of a review, each one click or one short comment away. */
export function ReviewActions({ contentId, title, size = 'md', decide = decideContentAction as DecideAction }: ReviewActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton variant="primary" size={size} icon={<CheckCircle2 />} label={t('common.approve')} action={decide.bind(null, contentId, 'APPROVED', { body: '' })} />
      <FormDialog
        schema="message"
        size="sm"
        title={t('content.review.changes.title', { title })}
        description={t('content.review.changes.desc')}
        submitLabel={t('common.requestChanges')}
        fields={[{ name: 'body', label: t('content.review.comment'), type: 'textarea', required: true, rows: 4, placeholder: t('content.review.changes.placeholder'), span: 2 }]}
        defaults={{ body: '' }}
        action={decide.bind(null, contentId, 'CHANGES_REQUESTED')}
        trigger={
          <Button variant="outline" size={size}>
            <Undo2 />
            {t('common.requestChanges')}
          </Button>
        }
      />
      <FormDialog
        schema="message"
        size="sm"
        title={t('content.review.reject.title', { title })}
        description={t('content.review.reject.desc')}
        submitLabel={t('common.reject')}
        fields={[{ name: 'body', label: t('content.review.comment'), type: 'textarea', required: true, rows: 4, span: 2 }]}
        defaults={{ body: '' }}
        action={decide.bind(null, contentId, 'REJECTED')}
        trigger={
          <Button variant="danger" size={size}>
            <ThumbsDown />
            {t('common.reject')}
          </Button>
        }
      />
    </div>
  );
}
