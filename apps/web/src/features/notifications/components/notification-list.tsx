'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { markAllReadAction, markReadAction } from '../actions/notification.actions';
import type { Notification } from '../data/notifications.repository';

const KIND_ICON: Record<Notification['kind'], string> = {
  approval: 'text-warning',
  task: 'text-info',
  mention: 'text-violet',
  invoice: 'text-primary',
  system: 'text-muted',
  lead: 'text-pink',
};

interface NotificationListProps {
  items: Notification[];
  unread: number;
}

export function NotificationList({ items, unread }: NotificationListProps) {
  const [, startTransition] = useTransition();

  return (
    <div>
      {unread > 0 ? (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => startTransition(() => void markAllReadAction())}>
            <CheckCheck />
            {t('notifications.markAll')}
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface-1">
        {items.length === 0 ? (
          <li className="px-6 py-16 text-center">
            <Bell className="mx-auto mb-3 size-10 text-muted/50" />
            <p className="text-sm font-medium">{t('notifications.empty.title')}</p>
            <p className="mt-1 text-[13px] text-muted">{t('notifications.empty.body')}</p>
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={() => {
                  if (!item.read) startTransition(() => void markReadAction(item.id));
                }}
                className={cn('group flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2', !item.read && 'bg-primary/5')}
              >
                <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', item.read ? 'bg-border' : 'bg-primary shadow-[0_0_8px_var(--primary)]')} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <span className={cn('text-[11px] font-medium uppercase tracking-wide', KIND_ICON[item.kind])}>{t(`notifications.kind.${item.kind}`)}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">{item.body}</span>
                  <span className="mt-2 block text-[11px] text-muted/80">{relativeTime(item.at)}</span>
                </span>
                <span aria-hidden className="self-center text-xs font-medium text-primary group-hover:underline">
                  {t('notifications.open')}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
