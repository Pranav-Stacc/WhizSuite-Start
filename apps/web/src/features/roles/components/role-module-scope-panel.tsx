'use client';

import {
  allowedScopesForPermission,
  isAssignableScopeType,
  type AssignableScopeType,
  type ScopeType,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import {
  optionsForScope,
  scopeNeedsResource,
  scopeResourceLabel,
  type ScopeResourceOptions,
} from '@/features/team/components/scope-resource-fields';

type ResourceMode = 'all' | 'specific';

export interface RoleModuleScopePanelProps {
  module: string;
  /** Permission keys selected in this module — drives which scope types are offered. */
  activeKeys: string[];
  moduleScopes: Record<string, AssignableScopeType[]>;
  moduleResourceMode: Record<string, Partial<Record<AssignableScopeType, ResourceMode>>>;
  moduleResourceIds: Record<string, Partial<Record<AssignableScopeType, string[]>>>;
  scopeResources: ScopeResourceOptions;
  onToggleScope: (module: string, scope: AssignableScopeType, sampleKey: string) => void;
  onSetResourceMode: (module: string, scopeType: AssignableScopeType, mode: ResourceMode) => void;
  onToggleResourceId: (module: string, scopeType: AssignableScopeType, resourceId: string) => void;
  defaultScopeFor: (key: string) => AssignableScopeType;
}

export function RoleModuleScopePanel({
  module,
  activeKeys,
  moduleScopes,
  moduleResourceMode,
  moduleResourceIds,
  scopeResources,
  onToggleScope,
  onSetResourceMode,
  onToggleResourceId,
  defaultScopeFor,
}: RoleModuleScopePanelProps) {
  if (activeKeys.length === 0) return null;

  const sampleKey = activeKeys[0] ?? module;
  const allowed = [...new Set(activeKeys.flatMap((key) => allowedScopesForPermission(key)))];
  const chosen = new Set<ScopeType>(
    moduleScopes[module] ?? (activeKeys.length > 0 ? [defaultScopeFor(sampleKey)] : []),
  );

  if (allowed.length === 0) return null;

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-foreground shadow-sm"
      role="region"
      aria-label={t('roles.module.where')}
    >
      <p className="text-xs font-semibold text-foreground">{t('roles.module.where')}</p>
      <p className="mb-2 text-[11px] leading-snug text-muted">{t('roles.module.hint')}</p>
      <ul className="flex flex-wrap gap-1.5">
        {allowed.map((scope) => {
          const on = chosen.has(scope);
          return (
            <li key={scope}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                  on ? 'border-foreground bg-foreground/10 text-foreground' : 'border-border bg-surface text-muted',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleScope(module, scope, sampleKey)}
                  className="size-3.5 accent-primary"
                />
                {humanizeKey(scope)}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-muted">{t('roles.scopes.selected', { count: chosen.size || 1 })}</p>
      {[...chosen]
        .filter((scopeType): scopeType is AssignableScopeType => isAssignableScopeType(scopeType))
        .filter(scopeNeedsResource)
        .map((scopeType) => {
          const label = scopeResourceLabel(scopeType);
          const mode = moduleResourceMode[module]?.[scopeType] ?? 'all';
          const choices = optionsForScope(scopeType, scopeResources);
          const picked = new Set(moduleResourceIds[module]?.[scopeType] ?? []);
          return (
            <div key={scopeType} className="mt-3 space-y-2 border-t border-border pt-2">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                    mode === 'all' ? 'border-foreground bg-foreground/10 text-foreground' : 'border-border text-muted',
                  )}
                  onClick={() => onSetResourceMode(module, scopeType, 'all')}
                >
                  {t('team.roles.resource.all', { resource: label })}
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                    mode === 'specific'
                      ? 'border-foreground bg-foreground/10 text-foreground'
                      : 'border-border text-muted',
                  )}
                  onClick={() => onSetResourceMode(module, scopeType, 'specific')}
                >
                  {t('team.roles.resource.choose')}
                </button>
              </div>
              {mode === 'specific' ? (
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                  {choices.length === 0 ? (
                    <li className="px-2 py-1 text-[11px] text-muted">{t('team.roles.resource.empty')}</li>
                  ) : (
                    choices.map((item) => (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px] text-foreground hover:bg-surface-2">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={picked.has(item.id)}
                            onChange={() => onToggleResourceId(module, scopeType, item.id)}
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
  );
}
