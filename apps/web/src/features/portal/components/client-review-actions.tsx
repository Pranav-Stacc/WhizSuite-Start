import { CheckCircle2, ThumbsDown, Undo2 } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { FormDialog } from '@/shared/forms/form-dialog';
import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { clientDecideContentAction } from '../actions/portal.actions';

interface ClientReviewActionsProps {
  contentId: string;
  title: string;
}

export function ClientReviewActions({ contentId, title }: ClientReviewActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton variant="primary" icon={<CheckCircle2 />} label={t('common.approve')} action={clientDecideContentAction.bind(null, contentId, 'APPROVED', { body: '' })} />
      <FormDialog
        schema="message"
        size="sm"
        title={t('content.review.changes.title', { title })}
        description={t('content.review.changes.desc')}
        submitLabel={t('common.requestChanges')}
        fields={[{ name: 'body', label: t('content.review.comment'), type: 'textarea', required: true, rows: 4, placeholder: t('content.review.changes.placeholder'), span: 2 }]}
        defaults={{ body: '' }}
        action={clientDecideContentAction.bind(null, contentId, 'CHANGES_REQUESTED')}
        trigger={
          <Button variant="secondary">
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
        action={clientDecideContentAction.bind(null, contentId, 'REJECTED')}
        trigger={
          <Button variant="danger">
            <ThumbsDown />
            {t('common.reject')}
          </Button>
        }
      />
    </div>
  );
}
