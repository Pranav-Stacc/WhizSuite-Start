'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PermissionEffects,
  type MemberAccess,
  type MemberPermissionOverride,
  type Permission,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import type { PermissionRow } from '@/features/roles/services/permissions.service';
import { setMemberPermissionOverridesAction } from '../actions/member.actions';

interface MemberPermissionsPanelProps {
  memberId: string;
  overrides: MemberAccess['overrides'];
  /** Effective keys from the API (includes companions minus denials). */
  effectivePermissions: string[];
  /** Explicit ALLOW keys on assigned roles (for “from role” labels). */
  roleGrantedKeys: string[];
  catalog: PermissionRow[];
}

function overridesMap(overrides: readonly MemberPermissionOverride[]): Map<string, MemberPermissionOverride['effect']> {
  return new Map(overrides.map((row) => [row.key, row.effect]));
}

function applyOverrides(
  base: Set<string>,
  overrides: Map<string, MemberPermissionOverride['effect']>,
): Set<string> {
  const out = new Set(base);
  for (const [key, effect] of overrides) {
    if (effect === PermissionEffects.DENY) out.delete(key);
    else out.add(key);
  }
  return out;
}

/** Toggle ALLOW/DENY overrides on top of assigned roles (same model as mobile). */
export function MemberExtrasPanel({ memberId, overrides, effectivePermissions, roleGrantedKeys, catalog }: MemberPermissionsPanelProps) {
  const roleKeys = useMemo(() => new Set(roleGrantedKeys), [roleGrantedKeys]);
  const serverEffective = useMemo(() => new Set(effectivePermissions), [effectivePermissions]);
  const baseline = useMemo(() => overridesMap(overrides), [overrides]);
  const [pending, setPending] = useState<Map<string, MemberPermissionOverride['effect'] | null>>(new Map());
  const [saving, startTransition] = useTransition();

  const merged = useMemo(() => {
    const map = new Map(baseline);
    for (const [key, effect] of pending) {
      if (effect === null) map.delete(key);
      else map.set(key, effect);
    }
    return map;
  }, [baseline, pending]);

  const effective = useMemo(() => applyOverrides(serverEffective, merged), [serverEffective, merged]);
  const dirty = pending.size > 0;

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const perm of catalog) {
      const list = map.get(perm.category) ?? [];
      list.push(perm);
      map.set(perm.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const toggle = (key: Permission, granted: boolean) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(key, granted ? PermissionEffects.ALLOW : PermissionEffects.DENY);
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const mergedOverrides = new Map(baseline);
      for (const [key, effect] of pending) {
        if (effect === null) mergedOverrides.delete(key);
        else mergedOverrides.set(key, effect);
      }
      const overrides: MemberPermissionOverride[] = [...mergedOverrides.entries()].map(([key, effect]) => ({
        key: key as Permission,
        effect,
      }));
      const result = await setMemberPermissionOverridesAction(memberId, { overrides });
      if (result.ok) {
        toast.success(result.message);
        setPending(new Map());
      } else toast.error(result.message);
    });
  };

  if (catalog.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border-soft pt-4">
      <p className="text-xs text-muted">{t('team.detail.extras.hint')}</p>
      <p className="text-[11px] text-muted">{t('team.detail.permissions.scopeHint')}</p>
      <div className="max-h-[36vh] space-y-3 overflow-y-auto rounded-xl border border-border-soft p-3">
        {grouped.map(([category, perms]) => (
          <section key={category}>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{humanizeKey(category)}</h4>
            <ul className="grid gap-1 sm:grid-cols-2">
              {perms.map((perm) => {
                const on = effective.has(perm.key);
                const fromRole = roleKeys.has(perm.key);
                const override = merged.get(perm.key);
                return (
                  <li key={perm.key}>
                    <label
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:bg-surface-2',
                        on && 'bg-primary/10',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => toggle(perm.key as Permission, e.target.checked)}
                        className="size-3.5 accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {humanizeKey(perm.key)}
                        {fromRole ? (
                          <span className="ml-1 text-[10px] text-muted">({t('team.detail.extras.fromRole')})</span>
                        ) : null}
                        {override ? (
                          <span className="ml-1 text-[10px] text-primary">
                            {override === PermissionEffects.DENY ? t('team.detail.extras.denied') : t('team.detail.extras.extra')}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <Button variant="primary" size="sm" disabled={saving || !dirty} onClick={save}>
        {saving ? <Loader2 className="animate-spin" /> : null}
        {t('team.detail.extras.save')}
      </Button>
    </div>
  );
}
