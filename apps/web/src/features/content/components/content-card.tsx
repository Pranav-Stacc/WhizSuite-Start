import { CalendarClock } from 'lucide-react';
import type { ContentType, Platform } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { formatDateTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { PlatformStack } from '@/shared/ui/platform';

interface ContentCardContentProps {
  title: string;
  contentType: ContentType;
  platforms: Platform[];
  scheduledAt?: string;
  clientName?: string;
  clientColor?: string;
  authorName?: string;
}

/** Board card body; Kanban supplies drag, link and move menu around it. */
export function ContentCardContent({ title, contentType, platforms, scheduledAt, clientName, clientColor, authorName }: ContentCardContentProps) {
  return (
    <div className="space-y-2.5 pr-5">
      <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="size-2 shrink-0 rounded-full" style={{ background: clientColor }} />
        <span className="truncate">{clientName}</span>
        <span aria-hidden>·</span>
        <span>{t(`type.content.${contentType}`)}</span>
      </div>
      <div className="flex items-center gap-2">
        <PlatformStack platforms={platforms} size="xs" />
        {scheduledAt ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <CalendarClock className="size-3" />
            {formatDateTime(scheduledAt)}
          </span>
        ) : null}
        {authorName ? (
          <span className="ml-auto">
            <Avatar name={authorName} size="xs" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
