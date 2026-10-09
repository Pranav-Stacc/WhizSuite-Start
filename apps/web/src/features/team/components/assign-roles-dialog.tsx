'use client';

import type { ReactNode } from 'react';
import { useMemo, useState, useTransition } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNABLE_SCOPE_TYPE_KEYS,
  AssignableScopeTypes,
  RoleKinds,
  type AccessRoleSummary,
  type AssignableScopeType,
} from '@agency-os/contracts';
import { t } from '@/shared/i18n/t';
import { cn } from '@/shared/lib/cn';
import { humanizeKey } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Select } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/overlays';
import { assignMemberRolesAction } from '../actions/member.actions';
import type { Member } from '../data/members.repository';

interface AssignRolesDialogProps {
  member: Pick<Member, 'id' | 'name' | 'roles'>;
  /** Every role that may be granted from the team screen (the owner role is excluded). */
  assignable: AccessRoleSummary[];
  /** Optional custom open control (e.g. from a workflow stage editor). */
  trigger?: ReactNode;
}

export function AssignRolesDialog({ member, assignable, trigger }: AssignRolesDialogProps) {
  const assignableIds = useMemo(() => new Set(assignable.map((role) => role.id)), [assignable]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(member.roles.map((role) => role.id).filter((id) => assignableIds.has(id))),
  );
  const [scopeType, setScopeType] = useState<AssignableScopeType>(AssignableScopeTypes.ORGANIZATION);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setSelected(new Set(member.roles.map((role) => role.id).filter((id) => assignableIds.has(id))));
    setScopeType(AssignableScopeTypes.ORGANIZATION);
  };

  const toggle = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const submit = () => {
    startTransition(async () => {
      const result = await assignMemberRolesAction(member.id, {
        roleIds: [...selected],
        scopes: [{ scopeType }],
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
                    <span className="min-w-0 flex-1 truncate">
                      {role.name}
                      {role.isSystem ? ` · ${t('roles.system')}` : ''}
                      {role.kind === RoleKinds.WORKFLOW ? ` · ${t('roles.kind.workflow')}` : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">{t('team.roles.hint')}</p>
          </div>
          <Field label={t('team.roles.scopeType')} htmlFor="assign-scope" hint={t('team.roles.scopes.hint')}>
            <Select
              id="assign-scope"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as AssignableScopeType)}
            >
              {ASSIGNABLE_SCOPE_TYPE_KEYS.map((scope) => (
                <option key={scope} value={scope}>
                  {humanizeKey(scope)}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="primary" className="w-full" disabled={pending || selected.size === 0} onClick={submit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t('team.roles.save')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
