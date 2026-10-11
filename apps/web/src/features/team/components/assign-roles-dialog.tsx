'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  type AccessRoleSummary,
  type AssignableScopeType,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { assignMemberRolesAction } from '../actions/member.actions';
import type { Member } from '../data/members.repository';
import {
  optionsForScope,
  scopeNeedsResource,
  scopeResourceLabel,
  type ScopeResourceOptions,
} from './scope-resource-fields';

const EMPTY_RESOURCES: ScopeResourceOptions = {
  departments: [],
  teams: [],
  clients: [],
  projects: [],
};

interface AssignRolesDialogProps {
  member: Pick<Member, 'id' | 'name' | 'roles'>;
  /** Every role that may be granted from the team screen (the owner role is excluded). */
  assignable: AccessRoleSummary[];
  resources?: ScopeResourceOptions;
  /** Optional custom open control (e.g. from a workflow stage editor). */
  trigger?: ReactNode;
}

export function AssignRolesDialog({ member, assignable, resources = EMPTY_RESOURCES, trigger }: AssignRolesDialogProps) {
  const assignableIds = useMemo(() => new Set(assignable.map((role) => role.id)), [assignable]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(member.roles.map((role) => role.id).filter((id) => assignableIds.has(id))),
  );
  const [checkedScopes, setCheckedScopes] = useState<Set<AssignableScopeType>>(
    () => new Set([AssignableScopeTypes.ORGANIZATION]),
  );
  const [resourceIds, setResourceIds] = useState<Partial<Record<AssignableScopeType, string[]>>>({});
  const [pending, startTransition] = useTransition();

  const offeredScopes = useMemo(() => {
    const set = new Set<AssignableScopeType>();
    for (const role of assignable) {
      if (!selected.has(role.id)) continue;
      const types = role.defaultScopeTypes.length > 0 ? role.defaultScopeTypes : [AssignableScopeTypes.ORGANIZATION];
      for (const scope of types) set.add(scope as AssignableScopeType);
    }
    return ASSIGNABLE_SCOPE_TYPE_KEYS.filter((scope) => set.has(scope));
  }, [assignable, selected]);

  const activeScopes = useMemo(() => {
    const kept = [...checkedScopes].filter((scope) => offeredScopes.includes(scope));
    if (kept.length > 0) return kept;
    if (offeredScopes.includes(AssignableScopeTypes.ORGANIZATION)) return [AssignableScopeTypes.ORGANIZATION];
    return offeredScopes;
  }, [checkedScopes, offeredScopes]);

  const reset = () => {
    const initialRoles = new Set(member.roles.map((role) => role.id).filter((id) => assignableIds.has(id)));
    setSelected(initialRoles);
    const offered = new Set<AssignableScopeType>();
    for (const role of assignable) {
      if (!initialRoles.has(role.id)) continue;
      for (const scope of role.defaultScopeTypes) offered.add(scope as AssignableScopeType);
    }
    const next = [...offered];
    setCheckedScopes(new Set(next.length > 0 ? next : [AssignableScopeTypes.ORGANIZATION]));
    setResourceIds({});
  };

  const toggle = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const missingResource = activeScopes.some(
    (scope) => scopeNeedsResource(scope) && (resourceIds[scope]?.length ?? 0) === 0,
  );
  const canSubmit = selected.size > 0 && activeScopes.length > 0 && !missingResource;

  const toggleScope = (scope: AssignableScopeType) => {
    const base = new Set(activeScopes);
    if (base.has(scope)) {
      if (base.size > 1) base.delete(scope);
    } else base.add(scope);
    setCheckedScopes(base);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await assignMemberRolesAction(member.id, {
        roleIds: [...selected],
        scopes: activeScopes.flatMap(
          (scopeType): { scopeType: AssignableScopeType; resourceId: string | null }[] => {
            if (!scopeNeedsResource(scopeType)) {
              return [{ scopeType, resourceId: null }];
            }
            const ids = resourceIds[scopeType] ?? [];
            return ids.map((resourceId) => ({ scopeType, resourceId }));
          },
        ),
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else toast.error(result.message);
    });
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  return (
    <>
      {trigger ? (
        <span onClick={openDialog}>{trigger}</span>
      ) : (
        <Button
          variant="soft"
          size="sm"
          aria-label={t('team.roles.assign.label', { name: member.name })}
          onClick={openDialog}
        >
          <ShieldCheck />
          {t('team.roles.assign')}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={t('team.roles.heading', { name: member.name })} width="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('team.roles.desc')}</p>
          <div>
            <p className="mb-2 text-sm font-medium">{t('team.roles.field')}</p>
            <ul className="max-h-[40vh] space-y-1 overflow-y-auto rounded-xl border border-border-soft p-2">
              {assignable.map((role) => (
                <li key={role.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2',
                      selected.has(role.id) && 'bg-primary/10',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(role.id)}
                      onChange={() => toggle(role.id)}
                      className="size-3.5 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {role.name}
                        {role.isSystem ? ` · ${t('roles.system')}` : ''}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {role.defaultScopeTypes.map((scope) => humanizeKey(scope)).join(', ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">{t('team.roles.hint')}</p>
          </div>
          {offeredScopes.length > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-sm font-medium">{t('team.roles.scopes')}</p>
                <p className="mb-2 text-xs text-muted">{t('team.roles.scopes.hint')}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {offeredScopes.map((scope) => {
                    const on = activeScopes.includes(scope);
                    return (
                      <li key={scope}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                            on ? 'border-primary bg-primary/10' : 'border-border-soft',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleScope(scope)}
                            className="size-3.5 accent-primary"
                          />
                          {humanizeKey(scope)}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {activeScopes.filter(scopeNeedsResource).map((scope) => {
                const choices = optionsForScope(scope, resources);
                const picked = new Set(resourceIds[scope] ?? []);
                return (
                  <Field key={scope} label={scopeResourceLabel(scope)} htmlFor={`assign-${scope}`} hint={t('team.roles.resource.multiHint')}>
                    <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border-soft p-2">
                      {choices.length === 0 ? (
                        <li className="px-2 py-1 text-xs text-muted">{t('team.roles.resource.empty')}</li>
                      ) : (
                        choices.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-surface-2">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={picked.has(item.id)}
                                onChange={() => {
                                  setResourceIds((prev) => {
                                    const current = new Set(prev[scope] ?? []);
                                    if (current.has(item.id)) current.delete(item.id);
                                    else current.add(item.id);
                                    return { ...prev, [scope]: [...current] };
                                  });
                                }}
                              />
                              <span className="truncate">{item.label}</span>
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                  </Field>
                );
              })}
            </div>
          ) : null}
          <Button variant="primary" className="w-full" disabled={pending || !canSubmit} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t('team.roles.save')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
