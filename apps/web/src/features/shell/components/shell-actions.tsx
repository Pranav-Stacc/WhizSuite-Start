'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Bell, Check, LogOut, Plus, Repeat, Settings } from 'lucide-react';
import type { Permission, UserRole } from '@agency-os/contracts';
import { PERSONAS } from '@/shared/auth/roles';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { relativeTime } from '@/shared/lib/format';
import { QUICK_CREATE } from '@/shared/navigation/quick-create';
import { markAllReadAction, markReadAction } from '@/features/notifications/actions/notification.actions';
import { signOutAction, switchPersonaAction } from '@/features/auth/actions/auth.actions';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Menu, Popover, Tooltip } from '@/shared/ui/overlays';

export function QuickCreate({ permissions }: { permissions: Permission[] }) {
  const granted = new Set(permissions);
  const actions = QUICK_CREATE.filter((a) => granted.has(a.permission));
  if (actions.length === 0) return null;
  return (
    <Menu.Root>
      <Tooltip content={t('shell.quickCreate')}>
        <Menu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('shell.quickCreate')}>
            <Plus />
          </Button>
        </Menu.Trigger>
      </Tooltip>
      <Menu.Content>
        <Menu.Label>{t('shell.quickCreate')}</Menu.Label>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Menu.Item key={action.href} asChild>
              <Link href={action.href}>
                <Icon />
                {t(action.label)}
              </Link>
            </Menu.Item>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
}

export interface NotificationView {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  at: string;
}

export function NotificationsBell({ items, unread }: { items: NotificationView[]; unread: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <Popover.Root>
      <Tooltip content={t('shell.notifications')}>
        <Popover.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={`${t('shell.notifications')}${unread ? ` (${t('shell.notifications.unread', { count: unread })})` : ''}`} className="relative">
            <Bell />
            {unread > 0 ? <span className="absolute right-2 top-2 size-1.5 rounded-full bg-foreground" /> : null}
          </Button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Content className="w-[min(94vw,380px)]">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <p className="text-sm font-semibold">{t('shell.notifications')}</p>
          {unread > 0 ? (
            <button type="button" onClick={() => startTransition(() => void markAllReadAction())} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Check className="size-3.5" />
              {t('shell.notifications.markAll')}
            </button>
          ) : null}
        </div>
        <ul className="max-h-96 divide-y divide-border-soft overflow-y-auto">
          {items.length === 0 ? <li className="px-4 py-10 text-center text-sm text-muted">{t('shell.notifications.empty')}</li> : null}
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => void markReadAction(n.id));
                  router.push(n.href);
                }}
                className={cn('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2', !n.read && 'bg-primary/5')}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted/80">{relativeTime(n.at)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Link href="/notifications" className="block border-t border-border-soft px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-surface-2">
          {t('shell.notifications.seeAll')}
        </Link>
      </Popover.Content>
    </Popover.Root>
  );
}

export function UserMenu({ name, email, role, orgName, demo, settingsHref }: { name: string; email: string; role: UserRole; orgName: string; demo: boolean; settingsHref?: string }) {
  const [, startTransition] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button type="button" aria-label={name} className="rounded-full outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar name={name} size="xs" className="ring-1 ring-border" />
        </button>
      </Menu.Trigger>
      <Menu.Content className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            <p className="mt-0.5 truncate text-[11px] text-primary">
              {t(`shell.role.${role}` as MessageKey)} · {orgName}
            </p>
          </div>
        </div>
        <Menu.Separator />
        {settingsHref ? (
          <Menu.Item asChild>
            <Link href={settingsHref}>
              <Settings />
              {t('shell.user.settings')}
            </Link>
          </Menu.Item>
        ) : null}
        {demo ? (
          <>
            <Menu.Label>
              <Repeat className="mr-1 inline size-3" />
              {t('shell.user.switchRole')}
            </Menu.Label>
            {PERSONAS.filter((p) => p.role !== role).map((p) => (
              <Menu.Item key={p.role} onSelect={() => startTransition(() => void switchPersonaAction(p.role))}>
                <Avatar name={p.name} size="xs" />
                {t(p.titleKey)}
              </Menu.Item>
            ))}
            <Menu.Separator />
          </>
        ) : null}
        <Menu.Item onSelect={() => startTransition(() => void signOutAction())} className="text-danger data-[highlighted]:bg-danger/12 data-[highlighted]:text-danger">
          <LogOut />
          {t('shell.user.signOut')}
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
