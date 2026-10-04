import { CalendarClock, CheckCircle2, MessageSquare, Rocket, Send, ThumbsDown, Undo2, type LucideIcon } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { relativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import type { ContentEvent, ContentEventKind } from '../data/content.repository';

const EVENT_STYLE: Record<ContentEventKind, { icon: LucideIcon; tone: string }> = {
  comment: { icon: MessageSquare, tone: 'text-info bg-info/14' },
  submitted: { icon: Send, tone: 'text-warning bg-warning/14' },
  approved: { icon: CheckCircle2, tone: 'text-success bg-success/14' },
  changes: { icon: Undo2, tone: 'text-danger bg-danger/14' },
  rejected: { icon: ThumbsDown, tone: 'text-danger bg-danger/14' },
  scheduled: { icon: CalendarClock, tone: 'text-info bg-info/14' },
  published: { icon: Rocket, tone: 'text-primary bg-primary/14' },
};

export function ActivityTimeline({ events }: { events: ContentEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">{t('content.activity.empty')}</p>;
  return (
    <ol className="space-y-5">
      {events.map((event) => {
        const style = EVENT_STYLE[event.kind];
        const Icon = style.icon;
        return (
          <li key={event.id} className="flex gap-3">
            <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', style.tone)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <Avatar name={event.actorName} size="xs" />
                <span className="font-medium">{event.actorName}</span>
                <span className="text-muted">{t(`content.event.kind.${event.kind}`)}</span>
                <time dateTime={event.at} className="ml-auto text-xs text-muted">
                  {relativeTime(event.at)}
                </time>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-surface-2 px-3 py-2 text-sm">{event.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
