'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { createRoleAction } from '../actions/role.actions';
import type { PermissionRow } from '../services/permissions.service';

export function CreateRoleDialog({ permissions, trigger }: { permissions: PermissionRow[]; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const perm of permissions) {
      const list = map.get(perm.category) ?? [];
      list.push(perm);
      map.set(perm.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (perms: PermissionRow[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const perm of perms) {
        if (on) next.add(perm.key);
        else next.delete(perm.key);
      }
      return next;
    });
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createRoleAction({ name, description, permissionKeys: [...selected] });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setName('');
        setDescription('');
        setSelected(new Set());
      } else toast.error(result.message);
    });
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {t('roles.create')}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={t('roles.create.heading')} width="max-w-lg">
        <div className="space-y-4">
          <Field label={t('roles.name')} htmlFor="role-name">
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('roles.name.placeholder')} />
          </Field>
          <Field label={t('roles.field.description')} htmlFor="role-desc">
            <Textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">{t('roles.permissions')}</p>
            <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-border-soft p-3">
              {grouped.map(([category, perms]) => {
                const allOn = perms.every((perm) => selected.has(perm.key));
                return (
                  <section key={category}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{humanizeKey(category)}</h4>
                      <button type="button" className="text-[11px] font-medium text-primary hover:underline" onClick={() => toggleAll(perms, !allOn)}>
                        {allOn ? t('roles.permissions.clearAll') : t('roles.permissions.selectAll')}
                      </button>
                    </div>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {perms.map((perm) => (
                        <li key={perm.key}>
                          <label
                            title={perm.description || perm.key}
                            className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-2', selected.has(perm.key) && 'bg-primary/10')}
                          >
                            <input type="checkbox" checked={selected.has(perm.key)} onChange={() => toggle(perm.key)} className="size-3.5 accent-primary" />
                            <span className="truncate">{humanizeKey(perm.key)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{t('roles.permissions.selected', { count: selected.size })}</p>
          </div>
          <Button variant="primary" className="w-full" disabled={pending || !name || selected.size === 0} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t('roles.create.submit')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
