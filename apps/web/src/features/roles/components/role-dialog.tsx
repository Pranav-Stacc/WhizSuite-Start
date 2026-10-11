'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AssignableScopeTypes,
  RoleKinds,
  allowedScopesForPermission,
  isAssignableScopeType,
  moduleKeyForPermission,
  type AssignableScopeType,
  type Permission,
  type PermissionScopeInput,
  type ScopeType,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Input, Textarea } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import {
  optionsForScope,
  scopeNeedsResource,
  scopeResourceLabel,
  type ScopeResourceOptions,
} from '@/features/team/components/scope-resource-fields';
import { createRoleAction, updateRoleAction } from '../actions/role.actions';
import type { AgencyRole } from '../data/roles.repository';
import type { PermissionRow } from '../services/permissions.service';

const EMPTY_RESOURCES: ScopeResourceOptions = {
  departments: [],
  teams: [],
  clients: [],
  projects: [],
};

interface RoleDialogProps {
  permissions: PermissionRow[];
  scopeResources?: ScopeResourceOptions;
  /** When given, the dialog edits this custom role instead of creating one. */
  role?: Pick<
    AgencyRole,
    'id' | 'name' | 'description' | 'permissionKeys' | 'permissionScopes' | 'kind' | 'defaultScopeTypes'
  >;
  trigger?: ReactNode;
}

const MODULE_ORDER = [
  'content',
  'approvals',
  'projects',
  'tasks',
  'files',
  'clients',
  'workspaces',
  'leads',
  'calendar',
  'chat',
  'feedback',
  'invoices',
  'reports',
  'members',
  'ai',
];

function moduleRank(module: string): number {
  const index = MODULE_ORDER.indexOf(module);
  return index === -1 ? MODULE_ORDER.length : index;
}

function initialModuleScopes(
  role: RoleDialogProps['role'],
): Record<string, AssignableScopeType[]> {
  if (!role) return {};
  const rows: PermissionScopeInput[] =
    role.permissionScopes.length > 0
      ? role.permissionScopes
      : role.permissionKeys.map((key) => ({
          key: key as Permission,
          scopeTypes: role.defaultScopeTypes.filter((scope): scope is AssignableScopeType =>
            allowedScopesForPermission(key).includes(scope as AssignableScopeType),
          ),
        }));
  const map: Record<string, Set<AssignableScopeType>> = {};
  for (const row of rows) {
    const module = moduleKeyForPermission(row.key);
    const allowed = new Set(allowedScopesForPermission(row.key));
    const bucket = map[module] ?? new Set<AssignableScopeType>();
    for (const scope of row.scopeTypes) {
      if (allowed.has(scope)) bucket.add(scope);
    }
    if (bucket.size === 0 && allowed.has(AssignableScopeTypes.ORGANIZATION)) {
      bucket.add(AssignableScopeTypes.ORGANIZATION);
    }
    map[module] = bucket;
  }
  return Object.fromEntries(
    Object.entries(map).map(([module, scopes]) => [module, [...scopes]]),
  );
}

function defaultScopeFor(key: string): AssignableScopeType {
  const allowed = allowedScopesForPermission(key);
  return allowed.includes(AssignableScopeTypes.ORGANIZATION)
    ? AssignableScopeTypes.ORGANIZATION
    : allowed[0] ?? AssignableScopeTypes.ORGANIZATION;
}

type ResourceMode = 'all' | 'specific';

function initialModuleResources(role: RoleDialogProps['role']) {
  const modes: Record<string, Partial<Record<AssignableScopeType, ResourceMode>>> = {};
  const ids: Record<string, Partial<Record<AssignableScopeType, string[]>>> = {};
  if (!role) return { modes, ids };
  const rows: PermissionScopeInput[] =
    role.permissionScopes.length > 0
      ? role.permissionScopes
      : role.permissionKeys.map((key) => ({
          key: key as Permission,
          scopeTypes: role.defaultScopeTypes.filter(isAssignableScopeType),
        }));
  for (const row of rows) {
    const module = moduleKeyForPermission(row.key);
    for (const binding of row.scopeResources ?? []) {
      modes[module] = { ...modes[module], [binding.scopeType]: binding.resourceIds.length > 0 ? 'specific' : 'all' };
      if (binding.resourceIds.length > 0) {
        ids[module] = { ...ids[module], [binding.scopeType]: [...binding.resourceIds] };
      }
    }
  }
  return { modes, ids };
}

export function RoleDialog({ permissions, role, trigger, scopeResources = EMPTY_RESOURCES }: RoleDialogProps) {
  const editing = role !== undefined;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [moduleScopes, setModuleScopes] = useState<Record<string, AssignableScopeType[]>>(() =>
    initialModuleScopes(role),
  );
  const initialResources = initialModuleResources(role);
  const [moduleResourceMode, setModuleResourceMode] = useState(initialResources.modes);
  const [moduleResourceIds, setModuleResourceIds] = useState(initialResources.ids);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permissionKeys ?? []));
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const perm of permissions) {
      const module = perm.category || moduleKeyForPermission(perm.key);
      const list = map.get(module) ?? [];
      list.push(perm);
      map.set(module, list);
    }
    return [...map.entries()].sort(([a], [b]) => moduleRank(a) - moduleRank(b) || a.localeCompare(b));
  }, [permissions]);

  const toggle = (key: string, modulePerms: PermissionRow[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const turningOn = !next.has(key);
      if (turningOn) {
        next.add(key);
        const view = modulePerms.find((perm) => perm.key.endsWith('.view'));
        if (view && key !== view.key) next.add(view.key);
      } else {
        next.delete(key);
      }
      return next;
    });
    setModuleScopes((prev) => {
      if (prev[moduleKeyForPermission(key)]?.length) return prev;
      return { ...prev, [moduleKeyForPermission(key)]: [defaultScopeFor(key)] };
    });
  };

  const toggleAll = (module: string, perms: PermissionRow[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const perm of perms) {
        if (on) next.add(perm.key);
        else next.delete(perm.key);
      }
      return next;
    });
    if (on) {
      setModuleScopes((prev) => {
        if (prev[module]?.length) return prev;
        const sample = perms[0]?.key ?? module;
        return { ...prev, [module]: [defaultScopeFor(sample)] };
      });
    }
  };

  const toggleScope = (module: string, scope: AssignableScopeType, sampleKey: string) => {
    setModuleScopes((prev) => {
      const allowed = allowedScopesForPermission(sampleKey);
      const current = new Set(prev[module] ?? [defaultScopeFor(sampleKey)]);
      if (current.has(scope)) {
        if (current.size > 1) current.delete(scope);
      } else if (allowed.includes(scope)) {
        current.add(scope);
        if (scopeNeedsResource(scope)) {
          setModuleResourceMode((prevModes) => ({
            ...prevModes,
            [module]: { ...prevModes[module], [scope]: 'specific' },
          }));
        }
      }
      return { ...prev, [module]: [...current] };
    });
  };

  const reset = () => {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setModuleScopes(initialModuleScopes(role));
    const resources = initialModuleResources(role);
    setModuleResourceMode(resources.modes);
    setModuleResourceIds(resources.ids);
    setSelected(new Set(role?.permissionKeys ?? []));
  };

  const submit = () => {
    const permissionScopes: PermissionScopeInput[] = [];
    const scopeUnion = new Set<AssignableScopeType>();
    for (const key of selected) {
      const module = moduleKeyForPermission(key);
      const allowed = allowedScopesForPermission(key);
      const chosen = (moduleScopes[module] ?? [defaultScopeFor(key)]).filter((scope) =>
        allowed.includes(scope),
      );
      const scopeTypes = chosen.length > 0 ? chosen : [defaultScopeFor(key)];
      for (const scope of scopeTypes) scopeUnion.add(scope);
      const scopeResources = scopeTypes
        .filter((scopeType) => scopeNeedsResource(scopeType))
        .flatMap((scopeType) => {
          const mode = moduleResourceMode[module]?.[scopeType] ?? 'all';
          if (mode === 'all') return [];
          const resourceIds = moduleResourceIds[module]?.[scopeType] ?? [];
          return resourceIds.length > 0 ? [{ scopeType, resourceIds: [...resourceIds] }] : [];
        });
      permissionScopes.push({
        key: key as Permission,
        scopeTypes: [...scopeTypes],
        ...(scopeResources.length > 0 ? { scopeResources: scopeResources.map((row) => ({ ...row, resourceIds: [...row.resourceIds] })) } : {}),
      });
    }
    const defaultScopeTypes = [...scopeUnion];
    startTransition(async () => {
      const input = JSON.parse(
        JSON.stringify({
          name,
          description,
          kind: RoleKinds.ACCESS,
          permissionKeys: [...selected] as Permission[],
          defaultScopeTypes: defaultScopeTypes.length > 0 ? defaultScopeTypes : [AssignableScopeTypes.ORGANIZATION],
          permissionScopes,
        }),
      );
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

  const canSubmit = name.trim().length >= 2 && selected.size > 0;

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
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('roles.edit.heading') : t('roles.create.heading')}
        description={t('roles.description')}
        width="max-w-xl"
      >
        <div className="space-y-5">
          <Field label={t('roles.name')} htmlFor="role-name">
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('roles.name.placeholder')} />
          </Field>
          <Field label={t('roles.field.description')} htmlFor="role-desc">
            <Textarea id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">{t('roles.permissions')}</p>
            <div className="max-h-[55vh] space-y-4 overflow-y-auto rounded-xl border border-border-soft p-3">
              {grouped.map(([module, perms]) => {
                const active = perms.filter((perm) => selected.has(perm.key));
                const allOn = perms.every((perm) => selected.has(perm.key));
                const sampleKey = perms[0]?.key ?? module;
                const allowed = allowedScopesForPermission(sampleKey);
                const chosen = new Set<ScopeType>(
                  moduleScopes[module] ?? (active.length > 0 ? [defaultScopeFor(sampleKey)] : []),
                );
                return (
                  <section key={module}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{humanizeKey(module)}</h4>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-primary hover:underline"
                        onClick={() => toggleAll(module, perms, !allOn)}
                      >
                        {allOn ? t('roles.permissions.clearAll') : t('roles.permissions.selectAll')}
                      </button>
                    </div>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {perms.map((perm) => (
                        <li key={perm.key}>
                          <label
                            title={perm.description || perm.key}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-2',
                              selected.has(perm.key) && 'bg-primary/10',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(perm.key)}
                              onChange={() => toggle(perm.key, perms)}
                              className="size-3.5 accent-primary"
                            />
                            <span className="truncate">{humanizeKey(perm.key)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {active.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-border-soft bg-surface-2/40 px-2.5 py-2">
                        <p className="text-[11px] font-medium">{t('roles.module.where')}</p>
                        <p className="mb-2 text-[11px] text-muted">{t('roles.module.hint')}</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {allowed.map((scope) => {
                            const on = chosen.has(scope);
                            return (
                              <li key={scope}>
                                <label
                                  className={cn(
                                    'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                                    on ? 'border-primary bg-primary/10' : 'border-border-soft bg-surface',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleScope(module, scope, sampleKey)}
                                    className="size-3.5 accent-primary"
                                  />
                                  {humanizeKey(scope)}
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                        <p className="mt-1.5 text-[11px] text-muted">
                          {t('roles.scopes.selected', { count: chosen.size || 1 })}
                        </p>
                        {[...chosen]
                          .filter((scopeType): scopeType is AssignableScopeType => isAssignableScopeType(scopeType))
                          .filter(scopeNeedsResource)
                          .map((scopeType) => {
                          const label = scopeResourceLabel(scopeType);
                          const mode = moduleResourceMode[module]?.[scopeType] ?? 'all';
                          const choices = optionsForScope(scopeType, scopeResources);
                          const picked = new Set(moduleResourceIds[module]?.[scopeType] ?? []);
                          return (
                            <div key={scopeType} className="mt-3 space-y-2 border-t border-border-soft pt-2">
                              <p className="text-[11px] font-medium">{label}</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={cn(
                                    'rounded-full border px-2.5 py-1 text-[11px]',
                                    mode === 'all' ? 'border-primary bg-primary/10' : 'border-border-soft',
                                  )}
                                  onClick={() =>
                                    setModuleResourceMode((prev) => ({
                                      ...prev,
                                      [module]: { ...prev[module], [scopeType]: 'all' },
                                    }))
                                  }
                                >
                                  {t('team.roles.resource.all', { resource: label })}
                                </button>
                                <button
                                  type="button"
                                  className={cn(
                                    'rounded-full border px-2.5 py-1 text-[11px]',
                                    mode === 'specific' ? 'border-primary bg-primary/10' : 'border-border-soft',
                                  )}
                                  onClick={() =>
                                    setModuleResourceMode((prev) => ({
                                      ...prev,
                                      [module]: { ...prev[module], [scopeType]: 'specific' },
                                    }))
                                  }
                                >
                                  {t('team.roles.resource.choose')}
                                </button>
                              </div>
                              {mode === 'specific' ? (
                                <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border-soft p-2">
                                  {choices.length === 0 ? (
                                    <li className="px-2 py-1 text-[11px] text-muted">{t('team.roles.resource.empty')}</li>
                                  ) : (
                                    choices.map((item) => (
                                      <li key={item.id}>
                                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-surface-2">
                                          <input
                                            type="checkbox"
                                            className="size-3.5 accent-primary"
                                            checked={picked.has(item.id)}
                                            onChange={() => {
                                              setModuleResourceIds((prev) => {
                                                const current = new Set(prev[module]?.[scopeType] ?? []);
                                                if (current.has(item.id)) current.delete(item.id);
                                                else current.add(item.id);
                                                return {
                                                  ...prev,
                                                  [module]: { ...prev[module], [scopeType]: [...current] },
                                                };
                                              });
                                            }}
                                          />
                                          <span className="truncate">{item.label}</span>
                                        </label>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-muted">{t('team.roles.resource.allHint')}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
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
