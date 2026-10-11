import {
  isAssignableScopeType,
  type PermissionScopeInput,
} from '@agency-os/contracts';
import type { AgencyRole } from '@/features/roles/data/roles.repository';
import { t } from '@/shared/i18n/t';
import { humanizeKey } from '@/shared/lib/format';
import { optionsForScope, type ScopeResourceOptions } from './scope-resource-fields';

function moduleKey(permissionKey: string): string {
  const dot = permissionKey.indexOf('.');
  return dot === -1 ? permissionKey : permissionKey.slice(0, dot);
}

function summarizeRole(role: AgencyRole, resources: ScopeResourceOptions): string[] {
  const byModule = new Map<
    string,
    { scopeTypes: Set<string>; bindings: Map<string, Set<string>> }
  >();

  const ingest = (row: PermissionScopeInput) => {
    const mod = moduleKey(row.key);
    const entry = byModule.get(mod) ?? {
      scopeTypes: new Set<string>(),
      bindings: new Map<string, Set<string>>(),
    };
    for (const scopeType of row.scopeTypes) entry.scopeTypes.add(scopeType);
    for (const binding of row.scopeResources ?? []) {
      const ids = entry.bindings.get(binding.scopeType) ?? new Set<string>();
      for (const id of binding.resourceIds) ids.add(id);
      entry.bindings.set(binding.scopeType, ids);
    }
    byModule.set(mod, entry);
  };

  for (const row of role.permissionScopes ?? []) ingest(row);

  if (byModule.size === 0 && role.defaultScopeTypes.length > 0) {
    return [
      t('team.detail.roleScope.default', {
        scopes: role.defaultScopeTypes.map((scope) => humanizeKey(scope)).join(', '),
      }),
    ];
  }

  return [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mod, entry]) => {
      const parts = [...entry.scopeTypes].map((scope) => humanizeKey(scope));
      for (const [scopeType, ids] of entry.bindings) {
        if (!isAssignableScopeType(scopeType) || ids.size === 0) continue;
        const labels = [...ids].map((id) => {
          const match = optionsForScope(scopeType, resources).find((row) => row.id === id);
          return match?.label ?? id;
        });
        parts.push(`${humanizeKey(scopeType)}: ${labels.join(', ')}`);
      }
      return `${humanizeKey(mod)} — ${parts.join(' · ')}`;
    });
}

/** Read-only summary of data scope configured on assigned roles (not overrides). */
export function MemberRoleScopeSummary({
  roles,
  scopeResources,
}: {
  roles: AgencyRole[];
  scopeResources: ScopeResourceOptions;
}) {
  const rows = roles
    .map((role) => ({ role, lines: summarizeRole(role, scopeResources) }))
    .filter((row) => row.lines.length > 0);
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {t('team.detail.permissions.dataScope')}
      </p>
      <ul className="space-y-2 text-xs">
        {rows.map(({ role, lines }) => (
          <li key={role.id}>
            <p className="font-medium text-foreground">{role.name}</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-muted">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
