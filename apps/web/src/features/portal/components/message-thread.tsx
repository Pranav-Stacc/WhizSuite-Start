import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { EmptyState } from '@/shared/ui/feedback';
import type { ThreadMessage } from '../data/thread.repository';

interface MessageThreadProps {
  messages: ThreadMessage[];
  /** Whose side of the conversation the viewer is on; their own messages align right. */
  viewer: 'client' | 'agency';
}

export function MessageThread({ messages, viewer }: MessageThreadProps) {
  if (messages.length === 0) return <EmptyState title={t('portal.messages.empty')} />;
  return (
    <ol className="space-y-4">
      {messages.map((message) => {
        const own = message.fromClient === (viewer === 'client');
        return (
          <li key={message.id} className={own ? 'flex justify-end' : 'flex justify-start'}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3', own ? 'bg-primary/14' : 'bg-surface-3')}>
              <div className="mb-1 flex items-center gap-2">
                {!own ? <Avatar name={message.authorName} size="xs" /> : null}
                <span className="text-xs font-medium">{message.authorName}</span>
                <span className="text-[11px] text-muted">{formatDateTime(message.at)}</span>
              </div>
              <p className="text-sm leading-relaxed">{message.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
