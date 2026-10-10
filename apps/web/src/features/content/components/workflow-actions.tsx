import { CalendarPlus, CheckCircle2, Rocket, Send, Undo2 } from 'lucide-react';
import type { ContentStatus } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { ActionButton } from '@/shared/ui/action-button';
import { moveContentAction } from '../actions/content.actions';
import { ReviewActions } from './review-actions';

interface WorkflowActionsProps {
  post: { id: string; title: string; status: ContentStatus };
  approver: boolean;
  size?: 'sm' | 'md';
}

/** The next workflow steps available to the current staff member for a post. */
export function WorkflowActions({ post, approver, size = 'md' }: WorkflowActionsProps) {
  const move = (target: ContentStatus, livePublish?: boolean) =>
    moveContentAction.bind(null, post.id, target, livePublish === undefined ? undefined : { livePublish });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.status === 'DRAFT' || post.status === 'CHANGES_REQUESTED' ? (
        <ActionButton variant="primary" size={size} icon={<Send />} label={t('content.action.submit')} action={move('IN_REVIEW')} />
      ) : null}
      {post.status === 'IN_REVIEW' ? (
        <>
          <ActionButton variant="ghost" size={size} icon={<Undo2 />} label={t('content.action.withdraw')} action={move('DRAFT')} />
          {approver ? <ReviewActions contentId={post.id} title={post.title} size={size} /> : <span className="text-[12px] text-muted">{t('content.waiting')}</span>}
        </>
      ) : null}
      {post.status === 'APPROVED' && approver ? (
        <>
          <ActionButton variant="primary" size={size} icon={<Rocket />} label={t('content.action.publishNow')} action={move('PUBLISHED', true)} />
          <ActionButton variant="secondary" size={size} icon={<CalendarPlus />} label={t('content.action.schedule')} action={move('SCHEDULED')} />
        </>
      ) : null}
      {post.status === 'SCHEDULED' && approver ? (
        <>
          <ActionButton variant="primary" size={size} icon={<Rocket />} label={t('content.action.publishNow')} action={move('PUBLISHED', true)} />
          <ActionButton variant="ghost" size={size} icon={<CheckCircle2 />} label={t('content.action.publish')} action={move('PUBLISHED', false)} />
          <ActionButton variant="ghost" size={size} icon={<Undo2 />} label={t('content.action.unschedule')} action={move('APPROVED')} />
        </>
      ) : null}
      {post.status === 'PUBLISHED' ? <span className="text-[12px] text-muted">{t('content.published.note')}</span> : null}
    </div>
  );
}
