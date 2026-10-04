import Link from 'next/link';
import { Archive, ArrowLeft, CornerUpLeft, UserCheck, UserMinus } from 'lucide-react';
import { t, type MessageKey } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { InlineMessageForm } from '@/shared/forms/inline-message-form';
import { ActionButton } from '@/shared/ui/action-button';
import { Avatar } from '@/shared/ui/avatar';
import { Card } from '@/shared/ui/card';
import { PlatformBadge, PLATFORM_META } from '@/shared/ui/platform';
import { StatusBadge, statusTone, TONE_COLOR } from '@/shared/ui/status';
import { StatusMenu } from '@/shared/ui/status-menu';
import { assignInboxItemAction, replyToInboxItemAction, setInboxStatusAction } from '../actions/inbox.actions';
import { InboxStatuses, type InboxItem } from '../data/inbox.repository';

interface ConversationPanelProps {
  item: InboxItem;
  clientName: string | undefined;
  assigneeName: string | undefined;
  currentUserId: string;
  backHref: string;
}

export function ConversationPanel({ item, clientName, assigneeName, currentUserId, backHref }: ConversationPanelProps) {
  const assignedToMe = item.assigneeId === currentUserId;
  const statusOptions = InboxStatuses.map((value) => ({
    value,
    label: t(`status.inbox.${value}` as MessageKey),
    color: TONE_COLOR[statusTone('inbox', value)],
  }));

  return (
    <Card className="flex flex-col gap-5 p-5 lg:sticky lg:top-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={backHref} className="inline-flex size-9 items-center justify-center rounded-lg border border-border-soft text-muted hover:text-foreground lg:hidden" aria-label={t('inbox.back')}>
            <ArrowLeft className="size-4" />
          </Link>
          <Avatar name={item.author} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{item.author}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <PlatformBadge platform={item.platform} size="xs" />
              {item.handle} · {PLATFORM_META[item.platform].label} · {t(`inbox.kind.${item.kind}` as MessageKey)}
            </p>
          </div>
        </div>
        <StatusMenu current={item.status} label={t('inbox.status.label')} options={statusOptions} action={setInboxStatusAction.bind(null, item.id)} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">{t('inbox.meta.client')}</dt>
          <dd className="truncate font-medium">{clientName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('inbox.meta.received')}</dt>
          <dd className="font-medium">{formatDateTime(item.receivedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('inbox.meta.sentiment')}</dt>
          <dd>
            <StatusBadge kind="sentiment" value={item.sentiment} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('inbox.meta.assignee')}</dt>
          <dd className="truncate font-medium">{assigneeName ?? t('common.unassigned')}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-border-soft bg-surface-2 px-4 py-3 text-sm leading-relaxed">{item.body}</div>
        {item.reply ? (
          <div className="ml-auto max-w-[92%]">
            <p className="mb-1 flex items-center justify-end gap-1.5 text-xs text-muted">
              <CornerUpLeft className="size-3" />
              {t('inbox.yourReply')}
            </p>
            <div className="rounded-2xl rounded-tr-sm bg-primary/16 px-4 py-3 text-sm leading-relaxed">{item.reply}</div>
          </div>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{item.reply ? t('inbox.reply.again') : t('inbox.reply.title')}</p>
        <InlineMessageForm
          action={replyToInboxItemAction.bind(null, item.id)}
          label={t('inbox.reply.title')}
          placeholder={t('inbox.reply.placeholder', { name: item.author })}
          submitLabel={t('inbox.reply.send')}
        />
        <p className="mt-1.5 text-xs text-muted">{t('inbox.reply.hint')}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border-soft pt-4">
        {assignedToMe ? (
          <ActionButton action={assignInboxItemAction.bind(null, item.id, undefined)} label={t('inbox.unassign')} icon={<UserMinus />} size="sm" />
        ) : (
          <ActionButton action={assignInboxItemAction.bind(null, item.id, currentUserId)} label={t('inbox.assignMe')} icon={<UserCheck />} size="sm" />
        )}
        {item.status !== 'archived' ? <ActionButton action={setInboxStatusAction.bind(null, item.id, 'archived')} label={t('inbox.archive')} icon={<Archive />} size="sm" /> : null}
      </div>
    </Card>
  );
}
