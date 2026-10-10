'use client';

import { AssignableScopeTypes, type AssignableScopeType } from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { Field, Select } from '@/shared/ui/field';

export interface ScopeResourceOption {
  id: string;
  label: string;
}

export interface ScopeResourceOptions {
  departments: ScopeResourceOption[];
  teams: ScopeResourceOption[];
  clients: ScopeResourceOption[];
  projects: ScopeResourceOption[];
}

const NEEDS_RESOURCE = new Set<AssignableScopeType>([
  AssignableScopeTypes.DEPARTMENT,
  AssignableScopeTypes.TEAM,
  AssignableScopeTypes.CLIENT,
  AssignableScopeTypes.PROJECT,
]);

export function scopeNeedsResource(scopeType: AssignableScopeType): boolean {
  return NEEDS_RESOURCE.has(scopeType);
}

function optionsFor(scopeType: AssignableScopeType, resources: ScopeResourceOptions): ScopeResourceOption[] {
  switch (scopeType) {
    case AssignableScopeTypes.DEPARTMENT:
      return resources.departments;
    case AssignableScopeTypes.TEAM:
      return resources.teams;
    case AssignableScopeTypes.CLIENT:
      return resources.clients;
    case AssignableScopeTypes.PROJECT:
      return resources.projects;
    default:
      return [];
  }
}

function resourceLabel(scopeType: AssignableScopeType): string {
  switch (scopeType) {
    case AssignableScopeTypes.DEPARTMENT:
      return t('team.roles.resource.department');
    case AssignableScopeTypes.TEAM:
      return t('team.roles.resource.team');
    case AssignableScopeTypes.CLIENT:
      return t('team.roles.resource.client');
    case AssignableScopeTypes.PROJECT:
      return t('team.roles.resource.project');
    default:
      return t('team.roles.resource');
  }
}

interface ScopeResourceFieldsProps {
  scopeType: AssignableScopeType;
  resourceId: string;
  onScopeTypeChange: (value: AssignableScopeType) => void;
  onResourceIdChange: (value: string) => void;
  resources: ScopeResourceOptions;
  scopeOptions: readonly AssignableScopeType[];
}

export function ScopeResourceFields({
  scopeType,
  resourceId,
  onScopeTypeChange,
  onResourceIdChange,
  resources,
  scopeOptions,
}: ScopeResourceFieldsProps) {
  const needsResource = scopeNeedsResource(scopeType);
  const choices = optionsFor(scopeType, resources);

  return (
    <div className="space-y-3">
      <Field label={t('team.roles.scopeType')} htmlFor="assign-scope" hint={t('team.roles.scopes.hint')}>
        <Select
          id="assign-scope"
          value={scopeType}
          onChange={(e) => {
            onScopeTypeChange(e.target.value as AssignableScopeType);
            onResourceIdChange('');
          }}
        >
          {scopeOptions.map((scope) => (
            <option key={scope} value={scope}>
              {scope.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </Select>
      </Field>
      {needsResource ? (
        <Field label={resourceLabel(scopeType)} htmlFor="assign-resource" hint={t('team.roles.resource.hint')}>
          <Select
            id="assign-resource"
            value={resourceId}
            onChange={(e) => onResourceIdChange(e.target.value)}
          >
            <option value="">{t('team.roles.resource.placeholder')}</option>
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
