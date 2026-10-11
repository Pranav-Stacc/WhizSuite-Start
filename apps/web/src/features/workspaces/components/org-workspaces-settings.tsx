'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Loader2, Plus } from 'lucide-react';
import type { TenancyWorkspace } from '@/shared/api/live/workspace';
import { t } from '@/shared/i18n/t';
import { Button } from '@/shared/ui/button';
import { Card, CardBody, CardHeader } from '@/shared/ui/card';
import { Field, Input } from '@/shared/ui/field';
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

interface OrgWorkspacesSettingsProps {
  workspaces: TenancyWorkspace[];
  activeId: string;
  canCreate: boolean;
}

export function OrgWorkspacesSettings({ workspaces, activeId, canCreate }: OrgWorkspacesSettingsProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const select = (id: string) => {
    start(async () => {
      const result = await switchTenancyWorkspaceAction(id);
      if (result.ok) router.refresh();
    });
  };

  const create = () => {
    start(async () => {
      const result = await createTenancyWorkspaceAction({ name: name.trim(), slug: slug.trim() });
      if (!result.ok) return;
      setShowForm(false);
      setName('');
      setSlug('');
      setSlugTouched(false);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader
        title={t('orgWorkspace.settings.title')}
        description={t('orgWorkspace.settings.desc')}
        action={
          canCreate ? (
            <Button variant="secondary" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus />
              {t('orgWorkspace.create')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {workspaces.length === 0 ? (
          <p className="text-sm text-muted">{t('orgWorkspace.empty')}</p>
        ) : (
          <ul className="divide-y divide-border-soft rounded-lg border border-border-soft">
            {workspaces.map((ws) => (
              <li key={ws.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Building className="size-4 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ws.name}</p>
                    <p className="truncate text-xs text-muted">{ws.slug}</p>
                  </div>
                </div>
                {ws.id === activeId ? (
                  <span className="text-xs font-medium text-primary">{t('orgWorkspace.current')}</span>
                ) : (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => select(ws.id)}>
                    {t('orgWorkspace.use')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {showForm ? (
          <div className="rounded-lg border border-border-soft p-4">
            <div className="space-y-3">
              <Field label={t('orgWorkspace.name')} htmlFor="settings-ws-name">
                <Input
                  id="settings-ws-name"
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugTouched) setSlug(toSlug(next));
                  }}
                />
              </Field>
              <Field label={t('orgWorkspace.slug')} htmlFor="settings-ws-slug" hint={t('orgWorkspace.slug.hint')}>
                <Input
                  id="settings-ws-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" type="button" disabled={pending} onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="button" disabled={pending || name.trim().length < 2} onClick={create}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                {t('orgWorkspace.create.submit')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
