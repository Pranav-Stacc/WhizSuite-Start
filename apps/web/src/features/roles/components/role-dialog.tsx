'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  RoleKinds,
  type RoleKind,
  type ScopeType,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select, Textarea } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { createRoleAction, updateRoleAction } from '../actions/role.actions';
import type { AgencyRole } from '../data/roles.repository';
import type { PermissionRow } from '../services/permissions.service';

interface RoleDialogProps {
  permissions: PermissionRow[];
  /** When given, the dialog edits this custom role instead of creating one. */
  role?: Pick<AgencyRole, 'id' | 'name' | 'description' | 'permissionKeys' | 'kind' | 'defaultScopeTypes'>;
  trigger?: ReactNode;
}

export function RoleDialog({ permissions, role, trigger }: RoleDialogProps) {
  const editing = role !== undefined;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [kind, setKind] = useState<RoleKind>(role?.kind ?? RoleKinds.ACCESS);
  const [scopes, setScopes] = useState<Set<ScopeType>>(
    () => new Set(role?.defaultScopeTypes?.length ? role.defaultScopeTypes : [AssignableScopeTypes.ORGANIZATION]),
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permissionKeys ?? []));
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

  const toggleScope = (scope: ScopeType) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        if (next.size > 1) next.delete(scope);
      } else next.add(scope);
      return next;
    });
  };

  const reset = () => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setKind(role?.kind ?? RoleKinds.ACCESS);
    setScopes(new Set(role?.defaultScopeTypes?.length ? role.defaultScopeTypes : [AssignableScopeTypes.ORGANIZATION]));
    setSelected(new Set(role?.permissionKeys ?? []));
  };

  const submit = () => {
    startTransition(async () => {
      const input = {
        name,
        description,
        kind,
        permissionKeys: [...selected],
        defaultScopeTypes: [...scopes],
      };
      const result = editing ? await updateRoleAction(role.id, input) : await createRoleAction(input);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        if (!editing) reset();
      } else toast.error(result.message);
    });
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  const accessNeedsPermissions = kind === RoleKinds.ACCESS;
  const canSubmit =
    name.trim().length >= 2 &&
    scopes.size > 0 &&
    (!accessNeedsPermissions || selected.size > 0);

  return (
    <>
      {trigger ? (
        <span onClick={openDialog}>{trigger}</span>
      ) : editing ? (
        <Button variant="ghost" size="sm" onClick={openDialog} aria-label={t('roles.edit.label', { name: role.name })}>
          <Pencil className="size-4" />
          {t('roles.edit')}
        </Button>
      ) : (
        <Button variant="primary" onClick={openDialog}>
          <Plus className="size-4" />
          {t('roles.create')}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={editing ? t('roles.edit.heading') : t('roles.create.heading')} width="max-w-lg">
        <div className="space-y-4">
          <Field label={t('roles.name')} htmlFor="role-name">
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('roles.name.placeholder')} />
          </Field>
          <Field label={t('roles.field.description')} htmlFor="role-desc">
            <Textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label={t('roles.kind')} htmlFor="role-kind" hint={t('roles.kind.hint')}>
            <Select
              id="role-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as RoleKind)}
              disabled={editing}
            >
              <option value={RoleKinds.ACCESS}>{t('roles.kind.access')}</option>
              <option value={RoleKinds.WORKFLOW}>{t('roles.kind.workflow')}</option>
            </Select>
          </Field>
          <div>
            <p className="mb-1 text-sm font-medium">{t('roles.scopes')}</p>
            <p className="mb-2 text-xs text-muted">{t('roles.scopes.hint')}</p>
            <ul className="flex flex-wrap gap-1.5">
              {ASSIGNABLE_SCOPE_TYPE_KEYS.map((scope) => (
                <li key={scope}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-xs',
                      scopes.has(scope) ? 'border-primary bg-primary/10' : 'border-border-soft',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={scopes.has(scope)}
                      onChange={() => toggleScope(scope)}
                      className="size-3.5 accent-primary"
                    />
                    {humanizeKey(scope)}
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{t('roles.scopes.selected', { count: scopes.size })}</p>
          </div>
          {kind === RoleKinds.WORKFLOW ? (
            <p className="rounded-xl border border-border-soft bg-surface-2 px-3 py-2 text-xs text-muted">
              {t('roles.permissions.workflowHint')}
            </p>
          ) : null}
          <div>
            <p className="mb-2 text-sm font-medium">{t('roles.permissions')}</p>
            <div className="max-h-[40vh] space-y-3 overflow-y-auto rounded-xl border border-border-soft p-3">
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
          <Button variant="primary" className="w-full" disabled={pending || !canSubmit} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {editing ? t('roles.edit.submit') : t('roles.create.submit')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
