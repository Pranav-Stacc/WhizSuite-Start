import { CalendarClock, CheckCircle2, MessageSquare, Rocket, Send, ThumbsDown, Undo2, type LucideIcon } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { relativeTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { ContentEvent, ContentEventKind } from '../data/content.repository';

const EVENT_STYLE: Record<ContentEventKind, { icon: LucideIcon; tone: string }> = {
  comment: { icon: MessageSquare, tone: 'text-muted' },
  submitted: { icon: Send, tone: 'text-warning' },
  approved: { icon: CheckCircle2, tone: 'text-success' },
  changes: { icon: Undo2, tone: 'text-danger' },
  rejected: { icon: ThumbsDown, tone: 'text-danger' },
  scheduled: { icon: CalendarClock, tone: 'text-info' },
  published: { icon: Rocket, tone: 'text-foreground' },
};

export function ActivityTimeline({ events }: { events: ContentEvent[] }) {
  if (events.length === 0) return <p className="text-[13px] text-muted">{t('content.activity.empty')}</p>;
  return (
    <ol className="space-y-5">
      {events.map((event) => {
        const style = EVENT_STYLE[event.kind];
        const Icon = style.icon;
        return (
          <li key={event.id}>
            <p className="flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-[0.12em]">
              <Icon className={cn('size-3.5', style.tone)} aria-hidden />
              <span className="text-foreground">{event.actorName}</span>
              <span className="text-muted">{t(`content.event.kind.${event.kind}`)}</span>
              <time dateTime={event.at} className="ml-auto normal-case tracking-normal text-muted">
                {relativeTime(event.at)}
              </time>
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words border-l border-border-strong pl-3 text-[13px] leading-relaxed">{event.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
