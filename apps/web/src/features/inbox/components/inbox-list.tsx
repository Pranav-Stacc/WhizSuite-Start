import Link from 'next/link';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { PlatformBadge } from '@/shared/ui/platform';
import { StatusBadge } from '@/shared/ui/status';
import type { InboxItem } from '../data/inbox.repository';

interface InboxListProps {
  items: InboxItem[];
  selectedId: string | undefined;
  clientName: (clientId: string) => string | undefined;
  itemHref: (itemId: string) => string;
}

export function InboxList({ items, selectedId, clientName, itemHref }: InboxListProps) {
  return (
    <ul className="card-surface divide-y divide-border-soft overflow-hidden">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <Link
              href={itemHref(item.id)}
              aria-current={selected ? 'true' : undefined}
              className={cn('flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2', selected && 'bg-primary/8 shadow-[inset_2px_0_0_var(--primary)]')}
            >
              <span className="relative shrink-0">
                <Avatar name={item.author} size="md" />
                <PlatformBadge platform={item.platform} size="xs" className="absolute -bottom-1 -right-1 ring-2 ring-surface" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn('truncate text-sm', item.status === 'open' ? 'font-semibold' : 'font-medium text-muted')}>{item.author}</span>
                  <time dateTime={item.receivedAt} className="shrink-0 text-xs text-muted">
                    {relativeTime(item.receivedAt)}
                  </time>
                </span>
                <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{item.body}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{clientName(item.clientId)}</span>
                  <span aria-hidden>·</span>
                  <span>{t(`inbox.kind.${item.kind}` as MessageKey)}</span>
                  {item.status !== 'open' ? <StatusBadge kind="inbox" value={item.status} dot={false} /> : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
