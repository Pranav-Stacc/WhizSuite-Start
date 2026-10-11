'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Layers, Loader2, Plus } from 'lucide-react';
import type { TenancyWorkspace } from '@/shared/api/live/workspace';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/field';
import { Menu } from '@/shared/ui/overlays';
import {
  createTenancyWorkspaceAction,
  switchTenancyWorkspaceAction,
} from '../actions/tenancy-workspace.actions';

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface OrgWorkspaceSwitcherProps {
  workspaces: TenancyWorkspace[];
  activeId: string;
  canCreate: boolean;
}

/** Picks the agency workspace used for new clients and client list filtering. */
export function OrgWorkspaceSwitcher({ workspaces, activeId, canCreate }: OrgWorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  if (!active) return null;

  const switchTo = (id: string) => {
    if (id === activeId) return;
    start(async () => {
      const result = await switchTenancyWorkspaceAction(id);
      if (result.ok) router.refresh();
    });
  };

  const create = () => {
    start(async () => {
      const result = await createTenancyWorkspaceAction({ name: name.trim(), slug: slug.trim() });
      if (!result.ok) return;
      setCreateOpen(false);
      setName('');
      setSlug('');
      setSlugTouched(false);
      router.refresh();
    });
  };

  const showSwitcher = workspaces.length > 1 || canCreate;

  return (
    <>
      {showSwitcher ? (
        <Menu.Root>
          <Menu.Trigger
            disabled={pending}
            className="header-ctx-trigger hidden outline-none sm:inline-flex"
            aria-label={t('orgWorkspace.switch')}
          >
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="header-ctx-kicker">{t('orgWorkspace.kicker')}</span>
              <span className="flex items-center gap-1 truncate">
                <Layers className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{active.name}</span>
                <ChevronDown className="size-3 shrink-0" aria-hidden />
              </span>
            </span>
          </Menu.Trigger>
          <Menu.Content className="w-64 p-1">
            <Menu.Label>{t('orgWorkspace.switch')}</Menu.Label>
            {workspaces.map((item) => (
              <Menu.Item key={item.id} disabled={pending} onSelect={() => switchTo(item.id)}>
                <Layers className="size-3.5" aria-hidden />
                <span className="flex-1 truncate">{item.name}</span>
                {item.id === activeId ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted">{t('orgWorkspace.current')}</span>
                ) : null}
              </Menu.Item>
            ))}
            {canCreate ? (
              <Menu.Item disabled={pending} onSelect={() => setCreateOpen(true)}>
                <Plus className="size-3.5" aria-hidden />
                {t('orgWorkspace.create')}
              </Menu.Item>
            ) : null}
          </Menu.Content>
        </Menu.Root>
      ) : (
        <span
          className="header-ctx-trigger hidden cursor-default sm:inline-flex"
          title={active.name}
        >
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="header-ctx-kicker">{t('orgWorkspace.kicker')}</span>
            <span className="flex items-center gap-1 truncate">
              <Layers className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{active.name}</span>
            </span>
          </span>
        </span>
      )}

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-workspace-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border-soft bg-surface p-5 shadow-lg">
            <h2 id="create-workspace-title" className="text-base font-semibold">{t('orgWorkspace.create')}</h2>
            <p className="mt-1 text-sm text-muted">{t('orgWorkspace.create.desc')}</p>
            <div className="mt-4 space-y-3">
              <Field label={t('orgWorkspace.name')} htmlFor="ws-name">
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugTouched) setSlug(toSlug(next));
                  }}
                  autoFocus
                />
              </Field>
              <Field label={t('orgWorkspace.slug')} htmlFor="ws-slug" hint={t('orgWorkspace.slug.hint')}>
                <Input
                  id="ws-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" disabled={pending} onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" disabled={pending || name.trim().length < 2} onClick={create}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {t('orgWorkspace.create.submit')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
