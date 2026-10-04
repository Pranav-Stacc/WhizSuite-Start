'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Loader2, Plus, Search } from 'lucide-react';
import type { UserRole } from '@agency-os/contracts';
import { t, type MessageKey } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { groupsForRole } from '@/shared/navigation/nav-config';
import { QUICK_CREATE } from '@/shared/navigation/quick-create';
import { Kbd } from '@/shared/ui/feedback';
import type { SearchGroup } from './search-types';

const DEBOUNCE_MS = 160;
const MIN_QUERY = 2;

const itemClass =
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none data-[selected=true]:bg-primary/12 data-[selected=true]:text-primary [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted data-[selected=true]:[&_svg]:text-primary';
const headingClass = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted';

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    abort.current?.abort();
    if (query.trim().length < MIN_QUERY) {
      setRemote([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abort.current = controller;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = (await res.json()) as { groups: SearchGroup[] };
        setRemote(data.groups);
      } catch {
        /* aborted or offline — keep previous results */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const needle = query.trim().toLowerCase();
  const pages = useMemo(
    () =>
      groupsForRole(role)
        .flatMap((g) => g.items)
        .filter((item) => !needle || t(item.label).toLowerCase().includes(needle) || t(item.desc).toLowerCase().includes(needle)),
    [role, needle],
  );
  const actions = useMemo(() => QUICK_CREATE.filter((a) => a.roles.includes(role) && (!needle || t(a.label).toLowerCase().includes(needle))), [role, needle]);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      label={t('shell.search.open')}
      shouldFilter={false}
      overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[14vh] z-50 w-[min(92vw,640px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-pop"
    >
      <div className="flex items-center gap-3 border-b border-border-soft px-4">
        <Search className="size-4.5 text-muted" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t('shell.search.placeholder')}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
        />
        {loading ? <Loader2 className="size-4 animate-spin text-muted" /> : <Kbd>esc</Kbd>}
      </div>
      <Command.List className={cn('max-h-[min(60vh,440px)] overflow-y-auto p-2', headingClass)}>
        <Command.Empty className="px-4 py-10 text-center text-sm text-muted">{t('shell.search.empty')}</Command.Empty>

        {remote.map((group) => (
          <Command.Group key={group.type} heading={t(group.label as MessageKey)}>
            {group.items.map((item) => (
              <Command.Item key={`${group.type}-${item.id}`} value={`${group.type}-${item.id}`} onSelect={() => go(item.href)} className={itemClass}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.title}</span>
                  {item.subtitle ? <span className="block truncate text-xs text-muted">{item.subtitle}</span> : null}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}

        {actions.length > 0 ? (
          <Command.Group heading={t('shell.search.actions')}>
            {actions.map((action) => (
              <Command.Item key={action.href} value={`action-${action.href}`} onSelect={() => go(action.href)} className={itemClass}>
                <Plus />
                {t(action.label)}
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}

        {pages.length > 0 ? (
          <Command.Group heading={t('shell.search.pages')}>
            {pages.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item key={item.href} value={`page-${item.href}`} onSelect={() => go(item.href)} className={itemClass}>
                  <Icon />
                  <span className="flex-1">{t(item.label)}</span>
                  <span className="hidden text-xs text-muted sm:inline">{t(item.desc)}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : null}
      </Command.List>
      <div className="flex items-center justify-between border-t border-border-soft px-4 py-2 text-xs text-muted">
        <span>{t('shell.search.tip')}</span>
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <Kbd>↵</Kbd>
        </span>
      </div>
    </Command.Dialog>
  );
}

export function SearchTrigger({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      aria-label={t('shell.search.open')}
      className={cn(
        'group inline-flex h-9 items-center gap-2.5 rounded-lg border border-border-soft bg-surface-2/70 px-3 text-sm text-muted transition-colors hover:border-border hover:text-foreground',
        compact ? 'w-9 justify-center px-0' : 'w-56 xl:w-72',
      )}
    >
      <Search className="size-4" />
      {compact ? null : (
        <>
          <span className="flex-1 truncate text-left">{t('shell.search.placeholder')}</span>
          <Kbd>⌘K</Kbd>
        </>
      )}
    </button>
  );
}
